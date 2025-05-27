'use server';
/**
 * @fileOverview A flow to generate a contextual summary of the conversation.
 *
 * - generateContextSummary - A function that creates or updates a conversation summary.
 * - GenerateContextSummaryInput - The input type for the function.
 * - GenerateContextSummaryOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for messages that will be part of the summary content
const MessageForSummarySchema = z.object({
  senderName: z.string().describe('The name of the sender (e.g., User, NPC name).'),
  text: z.string().describe('The content of the message.'),
});

// Input schema for the context summarization flow
export const GenerateContextSummaryInputSchema = z.object({
  previousSummary: z.string().optional().describe('The existing summary of the conversation, if any. This provides ongoing context.'),
  messagesToSummarize: z.array(MessageForSummarySchema).describe('The latest batch of messages (typically the last 10 user and NPC messages) to incorporate into the new summary.'),
});
export type GenerateContextSummaryInput = z.infer<typeof GenerateContextSummaryInputSchema>;

// Output schema for the context summarization flow
export const GenerateContextSummaryOutputSchema = z.object({
  newSummary: z.string().describe('The new, updated summary of the conversation, emphasizing user-driven topics.'),
});
export type GenerateContextSummaryOutput = z.infer<typeof GenerateContextSummaryOutputSchema>;

// Define the prompt for the summarization AI
const summarizationPrompt = ai.definePrompt({
  name: 'summarizationPrompt',
  input: { schema: GenerateContextSummaryInputSchema },
  output: { schema: GenerateContextSummaryOutputSchema }, // Expect a structured JSON output
  prompt: `You are an AI assistant tasked with summarizing an ongoing conversation to keep NPC interactions relevant to the User's interests.
Given the previous summary (if one exists) and a list of recent messages, generate a new, concise summary.

CRITICAL INSTRUCTION: The new summary MUST heavily prioritize and reflect the topics, questions, and key information introduced or actively pursued by the 'User'.
Filter out conversational tangents or minor details not directly related to the User's main line of inquiry. The goal is to capture the essence of what the User wants to discuss.

Previous Summary:
{{#if previousSummary}}
{{previousSummary}}
{{else}}
(No previous summary. This is the beginning of the conversation, or the first summary being generated.)
{{/if}}

Recent Messages to Incorporate (Focus on 'User' messages):
{{#each messagesToSummarize}}
- {{this.senderName}}: "{{this.text}}"
{{/each}}

Based on the above, generate the new summary.
Return your response as a JSON object with a single key: "newSummary".
The summary should be brief, ideally one or two sentences, capturing the core user-driven topic.

Example Output:
{
  "newSummary": "The User is exploring the causes of the French Revolution, specifically asking about the role of economic disparity and Enlightenment ideas. NPCs are beginning to offer perspectives on these factors."
}
`,
});

// Define the Genkit flow for generating the context summary
export const generateContextSummaryFlow = ai.defineFlow(
  {
    name: 'generateContextSummaryFlow',
    inputSchema: GenerateContextSummaryInputSchema,
    outputSchema: GenerateContextSummaryOutputSchema,
  },
  async (input: GenerateContextSummaryInput) => {
    // If there are no new messages to summarize, and there's a previous summary,
    // it might be best to return the previous summary. Or, if no messages at all, indicate that.
    if (!input.messagesToSummarize || input.messagesToSummarize.length === 0) {
      return { newSummary: input.previousSummary || "No new messages to summarize. Conversation context is unchanged." };
    }

    try {
      const { output } = await summarizationPrompt(input);

      // Validate the output structure
      if (!output || typeof output.newSummary !== 'string') {
        console.error('Invalid or missing output from summarizationPrompt:', output);
        // Fallback strategy: a simple concatenation or a message indicating failure
        const fallbackText = input.messagesToSummarize
          .map(m => `${m.senderName}: ${m.text}`)
          .join('; ');
        return { newSummary: (input.previousSummary ? input.previousSummary + " | Recent points: " : "Summary Error. Recent: ") + fallbackText.substring(0, 500) };
      }
      console.log(`[Context Summary Flow] New summary generated: ${output.newSummary}`);
      return output;
    } catch (error) {
      console.error("Error in generateContextSummaryFlow:", error);
      // Provide a more informative error or re-throw to be handled by the caller
      throw new Error(`Failed to generate context summary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// Exported wrapper function to be called by the application
export async function generateContextSummary(input: GenerateContextSummaryInput): Promise<string> {
  const result = await generateContextSummaryFlow(input);
  return result.newSummary;
}
