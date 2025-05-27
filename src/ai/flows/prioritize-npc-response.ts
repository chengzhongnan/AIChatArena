'use server';

/**
 * @fileOverview This flow determines which NPC should respond first to a user message.
 *
 * - prioritizeNPCResponse - A function that prioritizes NPC responses based on user message.
 * - PrioritizeNPCResponseInput - The input type for the prioritizeNPCResponse function.
 * - PrioritizeNPCResponseOutput - The return type for the prioritizeNPCResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrioritizeNPCResponseInputSchema = z.object({
  userMessage: z.string().describe('The message from the user.'),
  npcProfiles: z
    .array(
      z.object({
        name: z.string().describe('The name of the NPC.'),
        profile: z.string().describe('The detailed profile of the NPC.'),
      })
    )
    .describe('An array of NPC profiles to consider.'),
});

export type PrioritizeNPCResponseInput = z.infer<typeof PrioritizeNPCResponseInputSchema>;

const PrioritizeNPCResponseOutputSchema = z.object({
  leadingNpc: z
    .string()
    .describe('The name of the NPC that should respond first to the user message.'),
  reasoning: z.string().describe('The reasoning behind choosing the leading NPC.'),
});

export type PrioritizeNPCResponseOutput = z.infer<typeof PrioritizeNPCResponseOutputSchema>;

export async function prioritizeNPCResponse(input: PrioritizeNPCResponseInput): Promise<PrioritizeNPCResponseOutput> {
  return prioritizeNPCResponseFlow(input);
}

const prioritizeNPCResponsePrompt = ai.definePrompt({
  name: 'prioritizeNPCResponsePrompt',
  input: {schema: PrioritizeNPCResponseInputSchema},
  output: {schema: PrioritizeNPCResponseOutputSchema},
  prompt: `Given the following user message and NPC profiles, determine which NPC should respond first and why.

User Message: {{{userMessage}}}

NPC Profiles:
{{#each npcProfiles}}
- Name: {{this.name}}
  Profile: {{this.profile}}
{{/each}}

Based on the user message, select the NPC that is most relevant and would provide the most insightful response.
You MUST return your answer as a JSON object with exactly two keys: "leadingNpc" (a string representing the name of the chosen NPC) and "reasoning" (a string explaining your choice).
`,
});

const prioritizeNPCResponseFlow = ai.defineFlow(
  {
    name: 'prioritizeNPCResponseFlow',
    inputSchema: PrioritizeNPCResponseInputSchema,
    outputSchema: PrioritizeNPCResponseOutputSchema,
  },
  async input => {
    const {output} = await prioritizeNPCResponsePrompt(input);
    if (!output || !output.leadingNpc || !output.reasoning) {
      console.error('Invalid or incomplete output from prioritizeNPCResponsePrompt:', output);
      throw new Error("The AI failed to decide which NPC should speak first or provide adequate reasoning.");
    }
    return output;
  }
);
