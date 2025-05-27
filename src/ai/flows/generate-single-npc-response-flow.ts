'use server';
/**
 * @fileOverview A flow to generate a single response from an NPC, guided by a context summary.
 *
 * - generateSingleNpcResponse - A function that handles generating a single NPC response.
 * - GenerateSingleNpcResponseInput - The input type for the function.
 * - GenerateSingleNpcResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { MessageData } from 'genkit'; // Genkit's type for message data

// Schema for individual message parts (aligns with Genkit's structure)
const GenkitMessagePartSchema = z.object({
  text: z.string().optional(),
  media: z.object({ url: z.string(), contentType: z.string().optional() }).optional(),
  toolRequest: z.any().optional(), // For potential future tool use
  toolResponse: z.any().optional(),// For potential future tool use
});

// Schema for a single message in the chat history (aligns with Genkit's structure)
const GenkitMessageDataSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'tool']),
  content: z.array(GenkitMessagePartSchema),
});

// Define input schema for the flow, now including contextSummary
const GenerateSingleNpcResponseInputSchema = z.object({
  npcName: z.string().describe('The name of the NPC.'),
  npcSystemPrompt: z.string().describe('The base system prompt defining the NPC\'s character, personality, and general instructions.'),
  userMessageText: z.string().describe('The latest message text from the user that the NPC needs to respond to.'),
  // llmChatHistory 现在是必填项，但我们会在逻辑中确保它至少是空数组
  llmChatHistory: z.array(GenkitMessageDataSchema).describe('The recent history of the chat conversation (e.g., last 10 messages) formatted for the LLM, excluding the current userMessageText.'),
  contextSummary: z.string().optional().describe('A crucial summary of the ongoing conversation, highlighting user-driven topics. This summary should heavily influence the NPC\'s response to ensure relevance.'),
});
export type GenerateSingleNpcResponseInput = z.infer<typeof GenerateSingleNpcResponseInputSchema>;

// Define output schema for the flow
const GenerateSingleNpcResponseOutputSchema = z.object({
  responseText: z.string().describe('The generated response text from the NPC.'),
});
export type GenerateSingleNpcResponseOutput = z.infer<typeof GenerateSingleNpcResponseOutputSchema>;

// --- Abstracted Flow Logic Function ---
async function executeNpcResponseLogic(input: GenerateSingleNpcResponseInput): Promise<GenerateSingleNpcResponseOutput> {
  // 校验关键输入
  if (!input.npcName || !input.npcSystemPrompt || !input.userMessageText) {
    const errorMsg = `错误 (NPC: ${input.npcName || '未知'}): 缺少关键输入 (NPC名称, NPC系统提示, 或用户消息文本)。`;
    console.error(errorMsg);
    return { responseText: `我似乎缺少一些必要的信息来回应 (${input.npcName || '未知'})。` };
  }

  // 1. 构建系统指令
  let systemInstruction = `你是一个名为 ${input.npcName} 的NPC。你的性格和指令是："${input.npcSystemPrompt}"。`;

  // 如果有上下文摘要，则强调其重要性
  if (input.contextSummary && input.contextSummary.trim() !== "") {
    systemInstruction += `\n\n重要的对话焦点：当前的对话主题（由用户驱动）可以概括为："${input.contextSummary}"。你的回应必须承认、建立在或直接关联到这个总结的焦点。确保你的发言与这个用户定义的上下文相关，尤其是在回应他们的最新消息时。除非用户明确表示主题转移，否则不要引入不相关的话题。`;
  } else {
    systemInstruction += `\n\n根据你的个性和最近的对话历史，直接回应用户的最新消息。`;
  }
  
  // 最终指令
  systemInstruction += `\n\n综合考虑以上所有信息（你的角色、对话焦点和最近的聊天历史），请对用户提供的最新消息进行回应。你的回答应该自然、流畅，并符合你的性格设定。`;

  // 2. 准备聊天历史
  // 确保 llmChatHistory 是一个数组，即使它是空的。
  // slice(-10) 用于获取最近的10条消息。如果不足10条，则获取所有。
  const recentChatHistoryForLlm: MessageData[] = (input.llmChatHistory || []).slice(-10);

  // 3. 构建发送给LLM的完整消息数组
  const messagesForLlm: MessageData[] = [
    { role: 'system', content: [{ text: systemInstruction }] },
    ...recentChatHistoryForLlm, // 展开处理后的聊天历史
    { role: 'user', content: [{ text: input.userMessageText }] }, // 当前的用户消息
  ];

  // 4. 详细的调试日志，便于观察传递给LLM的内容
  console.log(`\n--- NPC Response Generation Debug Log for [${input.npcName}] ---`);
  console.log(`  NPC Name: ${input.npcName}`);
  console.log(`  System Prompt: "${input.npcSystemPrompt}"`);
  console.log(`  User Message Text: "${input.userMessageText}"`);
  console.log(`  Context Summary: ${input.contextSummary ? `"${input.contextSummary}"` : "无"}`);
  console.log(`  Original llmChatHistory length: ${input.llmChatHistory?.length || 0}`);
  console.log(`  Messages sent to LLM (including system instruction and user message):`);
  messagesForLlm.forEach((msg, index) => {
    console.log(`    Message ${index + 1} (Role: ${msg.role}):`);
    msg.content.forEach((part, pIdx) => {
      if (part.text) console.log(`      Content Text ${pIdx + 1}: "${part.text}"`);
      // 可以在这里添加对 media, toolRequest, toolResponse 的日志，如果需要的话
    });
  });
  console.log(`--- End Debug Log ---\n`);

  // 5. 调用Genkit AI模型生成响应
  try {
    const result = await ai.generate({
      messages: messagesForLlm,
      config: { temperature: 0.75 }, // 温度可根据需要调整
    });

    // 6. 提取响应文本
    let responseTextContent: string | undefined;

    // 优先从标准的 result.message.content[0].text 中提取
    if (result?.message?.content?.[0]?.text) {
      responseTextContent = result.message.content[0].text;
    }
    // 兼容 Gemini-like 的结构 (result.custom.candidates)
    else if (result?.custom?.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseTextContent = result.custom.candidates[0].content.parts[0].text;
    }

    // 检查是否成功提取到有效文本
    if (typeof responseTextContent !== 'string' || !responseTextContent.trim()) {
      console.error(`错误 (NPC: ${input.npcName}): 无法从AI响应中提取有效文本或响应为空。接收到的原始响应:`, JSON.stringify(result, null, 2));
      return { responseText: `我从AI那里收到了一个无法读取或空的回复 (${input.npcName})。请稍后再试。` };
    }

    return { responseText: responseTextContent };

  } catch (error: any) {
    console.error(`调用AI模型时发生错误 (NPC: ${input.npcName}):`, error);
    return { responseText: `我现在思考有些困难 (${input.npcName})。请稍后再试。` };
  }
}

// --- Genkit Flow Definition (Calls the abstracted logic function) ---
const generateSingleNpcResponseFlow = ai.defineFlow(
  {
    name: 'generateSingleNpcResponseFlow',
    inputSchema: GenerateSingleNpcResponseInputSchema,
    outputSchema: GenerateSingleNpcResponseOutputSchema,
  },
  async (input) => {
    // Genkit Flow 包装器，直接调用核心逻辑函数
    return executeNpcResponseLogic(input);
  }
);

// Exported wrapper function to be called by the application
// 注意：这个导出函数现在返回一个 Promise<string>，与旧版本行为一致
export async function generateSingleNpcResponse(input: GenerateSingleNpcResponseInput): Promise<string> {
  const result = await generateSingleNpcResponseFlow(input);
  return result.responseText;
}