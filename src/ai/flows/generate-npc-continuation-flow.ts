'use server';
/**
 * @fileOverview A flow to generate an NPC's continuation to a discussion when the user is inactive.
 *
 * - generateNpcContinuation - A function that selects an NPC and generates their message.
 * - GenerateNpcContinuationInput - The input type for the function.
 * - GenerateNpcContinuationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// 导入生成单个NPC响应的函数
import { generateSingleNpcResponse } from './generate-single-npc-response-flow'; // 确保路径正确
import type { GenerateSingleNpcResponseInput } from './generate-single-npc-response-flow'; // 导入类型
import type { MessageData } from 'genkit'; // 导入 Genkit 的 MessageData 类型，确保一致性

const NpcProfileSchema = z.object({
  name: z.string().describe('The name of the NPC.'),
  profile: z.string().describe('The system prompt/profile for this NPC.'),
});

const RecentMessageSchema = z.object({
  senderName: z.string().describe('The name of the sender.'),
  text: z.string().describe('The content of the message.'),
});

// Genkit MessageData Schema for chat history
const GenkitMessagePartSchema = z.object({
  text: z.string().optional(),
  media: z.object({ url: z.string(), contentType: z.string().optional() }).optional(),
  toolRequest: z.any().optional(),
  toolResponse: z.any().optional(),
});

const GenkitMessageDataSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'tool']),
  content: z.array(GenkitMessagePartSchema),
});


const GenerateNpcContinuationInputSchema = z.object({
  recentMessages: z.array(RecentMessageSchema).describe('The last few messages in the conversation to provide context.'),
  npcProfiles: z.array(NpcProfileSchema).describe('Profiles of all available NPCs.'),
  // 新增一个可选的上下文摘要，用于传递给 generateSingleNpcResponse
  contextSummary: z.string().optional().describe('A summary of the ongoing conversation, passed to the single NPC response generator.'),
  // 新增 LLM Chat History，用于传递给 generateSingleNpcResponse
  // 注意：虽然在这里标记为 optional，但在调用 generateSingleNpcResponse 时必须提供，
  // 所以在逻辑中会将其初始化为空数组 [] 如果它不存在。
  llmChatHistory: z.array(GenkitMessageDataSchema).optional().describe('The full chat history formatted for the LLM.'),
});
export type GenerateNpcContinuationInput = z.infer<typeof GenerateNpcContinuationInputSchema>;

const GenerateNpcContinuationOutputSchema = z.object({
  npcName: z.string().describe('The name of the NPC chosen to speak.'),
  continuationText: z.string().describe('The message generated for the NPC to continue the discussion.'),
  npcSystemPrompt: z.string().describe('The exact system prompt of the chosen NPC.'),
});
export type GenerateNpcContinuationOutput = z.infer<typeof GenerateNpcContinuationOutputSchema>;

export async function generateNpcContinuation(input: GenerateNpcContinuationInput): Promise<GenerateNpcContinuationOutput> {
  return generateNpcContinuationFlow(input);
}

const npcSelectorPrompt = ai.definePrompt({
  name: 'selectNpcForContinuationPrompt',
  input: { schema: GenerateNpcContinuationInputSchema },
  output: {
    schema: z.object({
      npcName: z.string().describe('The exact name of the chosen NPC from the provided list.'),
      npcSystemPrompt: z.string().describe('The exact \'profile\' string of the chosen NPC.'),
      triggerUserMessage: z.string().optional().describe('A simple internal "user message" that the chosen NPC should respond to, helping to guide their next statement.')
    }),
  },
  prompt: `You are an AI that helps orchestrate a multi-NPC chat by deciding which NPC should speak next to keep the conversation flowing if the user is quiet.

Review the recent conversation history:
{{#if recentMessages.length}}
{{#each recentMessages}}
- {{this.senderName}}: "{{this.text}}"
{{/each}}
{{else}}
(No recent messages, this is the start of a conversation segment)
{{/if}}

Here are the available NPC profiles:
{{#each npcProfiles}}
- Name: {{this.name}}
  Profile: {{this.profile}}
{{/each}}

Based on the conversation flow and NPC personalities, select ONE NPC from the list above that should speak next.

You MUST return your answer as a JSON object with three keys:
1.  "npcName": The exact name of the chosen NPC from the provided list.
2.  "npcSystemPrompt": The exact 'profile' string of the chosen NPC.
3.  "triggerUserMessage": A very brief, one-sentence internal instruction or "user message" that the chosen NPC should respond to. This message should prompt the NPC to continue the conversation naturally based on their personality and the recent context. For example, "What are your thoughts on the recent development?" or "It's your turn to add to the discussion." If it's the start of a conversation, prompt them to kick things off.

Example: If "Wise Old Wizard" is chosen, the output might be:
{
  "npcName": "Wise Old Wizard",
  "npcSystemPrompt": "You are a Wise Old Wizard...",
  "triggerUserMessage": "How do you intend to continue the discussion?"
}

If there are no NPCs, or the context is impossible to continue, you might need to handle this gracefully, but strive to pick an NPC and generate a message.
`,
});


const generateNpcContinuationFlow = ai.defineFlow(
  {
    name: 'generateNpcContinuationFlow',
    inputSchema: GenerateNpcContinuationInputSchema,
    outputSchema: GenerateNpcContinuationOutputSchema,
  },
  async (input) => {
    if (input.npcProfiles.length === 0) {
      throw new Error('No NPC profiles provided for continuation.');
    }

    // 确保 llmChatHistory 总是存在，即使它是一个空数组
    const llmChatHistoryForSingleNpc: MessageData[] = input.llmChatHistory || [];

    // 1. 调用提示词来选择下一个NPC
    const { output: selectionOutput } = await npcSelectorPrompt(input);

    if (!selectionOutput || !selectionOutput.npcName || !selectionOutput.npcSystemPrompt) {
      console.error('Invalid output from npcSelectorPrompt:', selectionOutput);
      // Fallback: 如果选择失败，随机选择一个NPC，并给一个通用消息
      const fallbackNpc = input.npcProfiles[Math.floor(Math.random() * input.npcProfiles.length)];
      console.warn(`Falling back to random NPC for continuation due to selection error.`);
      const fallbackContinuationText = await generateSingleNpcResponse({
        npcName: fallbackNpc.name,
        npcSystemPrompt: fallbackNpc.profile,
        userMessageText: "请继续对话。", // 一个通用的触发消息
        llmChatHistory: llmChatHistoryForSingleNpc, // 使用确保非空的 llmChatHistory
        contextSummary: input.contextSummary,
      });
      return {
        npcName: fallbackNpc.name,
        continuationText: fallbackContinuationText,
        npcSystemPrompt: fallbackNpc.profile,
      };
    }

    const chosenNpcProfile = input.npcProfiles.find(p => p.name === selectionOutput.npcName);

    if (!chosenNpcProfile) {
      console.error(`Continuation flow chose an NPC not in the list: ${selectionOutput.npcName}. Falling back.`);
      const fallbackNpc = input.npcProfiles[0]; // Pick the first one
      console.warn(`Falling back to first NPC in list due to mismatch.`);
      const fallbackContinuationText = await generateSingleNpcResponse({
        npcName: fallbackNpc.name,
        npcSystemPrompt: fallbackNpc.profile,
        userMessageText: selectionOutput.triggerUserMessage || "请继续对话。", // 使用LLM提供的触发消息或通用消息
        llmChatHistory: llmChatHistoryForSingleNpc, // 使用确保非空的 llmChatHistory
        contextSummary: input.contextSummary,
      });
      return {
        npcName: fallbackNpc.name,
        continuationText: fallbackContinuationText,
        npcSystemPrompt: fallbackNpc.profile,
      };
    }

    // 确保使用来自实际NPC配置文件的系统提示，而不是LLM可能错误生成的
    const npcSystemPromptToUse = chosenNpcProfile.profile;
    const userMessageForNpc = selectionOutput.triggerUserMessage || "请继续对话，保持对话的连贯性。";

    // 2. 使用选定的NPC和他们的系统提示，调用 generateSingleNpcResponse 来生成他们的消息
    const continuationText = await generateSingleNpcResponse({
      npcName: chosenNpcProfile.name,
      npcSystemPrompt: npcSystemPromptToUse,
      userMessageText: userMessageForNpc, // 传递由选择器LLM生成的内部“用户消息”
      llmChatHistory: llmChatHistoryForSingleNpc, // 使用确保非空的 llmChatHistory
      contextSummary: input.contextSummary, // 传递上下文摘要
    });

    // 3. 返回完整的输出对象
    return {
      npcName: chosenNpcProfile.name,
      continuationText: continuationText,
      npcSystemPrompt: npcSystemPromptToUse,
    };
  }
);