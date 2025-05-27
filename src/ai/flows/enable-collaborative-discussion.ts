// enable-collaborative-discussion.ts
'use server';
/**
 * @fileOverview Implements the collaborative discussion flow where multiple NPCs can contribute to the conversation.
 *
 * - collaborativeDiscussion - A function that orchestrates the collaborative discussion among NPCs.
 * - CollaborativeDiscussionInput - The input type for the collaborativeDiscussion function.
 * - CollaborativeDiscussionOutput - The return type for the collaborativeDiscussion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit'; // Assuming 'genkit' re-exports Zod as z.

const CollaborativeDiscussionInputSchema = z.object({
  userMessage: z.string().describe('The message from the user.'),
  leadingNpcContribution: z.object({
    npcName: z.string().describe('The name of the NPC who responded first.'),
    npcResponse: z.string().describe('The response from the leading NPC.'),
    npcPrompt: z.string().describe('The system prompt of the leading NPC.'),
  }).describe('The contribution from the NPC that responded first.'),
  otherNpcProfiles: z.array(
    z.object({
      name: z.string().describe('The name of an NPC.'),
      profile: z.string().describe('The system prompt/profile for this NPC.'),
    })
  ).describe('Profiles of other NPCs who might contribute to the discussion. This list excludes the leading NPC.'),
});

export type CollaborativeDiscussionInput = z.infer<typeof CollaborativeDiscussionInputSchema>;

const CollaborativeDiscussionOutputSchema = z.array(
  z.object({
    npcName: z.string().describe('The name of the NPC contributing to the discussion.'),
    response: z.string().describe('The contribution of the NPC to the discussion.'),
  })
).describe('An array of contributions from different NPCs to the discussion.');

export type CollaborativeDiscussionOutput = z.infer<typeof CollaborativeDiscussionOutputSchema>;

export async function collaborativeDiscussion(input: CollaborativeDiscussionInput): Promise<CollaborativeDiscussionOutput> {
  return collaborativeDiscussionFlow(input);
}

const collaborativeDiscussionPrompt = ai.definePrompt({
  name: 'collaborativeDiscussionPrompt',
  input: {schema: CollaborativeDiscussionInputSchema},
  output: {schema: CollaborativeDiscussionOutputSchema},
  prompt: `The user has sent the following message:
"{{{userMessage}}}"

The first NPC to respond, {{leadingNpcContribution.npcName}} (who has the profile: "{{leadingNpcContribution.npcPrompt}}"), said:
"{{leadingNpcContribution.npcResponse}}"

Now, consider the other available NPCs listed below. For each of them, decide if they have a relevant contribution to make to this discussion, based on the user's message and {{leadingNpcContribution.npcName}}'s response.
If an NPC has something to add, generate their response. If they don't, you can omit them or have them say something brief like "I have nothing to add at this moment." or simply not include them in the output.

Available NPCs to consider for follow-up (these are the NPCs other than {{leadingNpcContribution.npcName}}):
{{#if otherNpcProfiles.length}}
{{#each otherNpcProfiles}}
- Name: {{this.name}}
  Profile: {{this.profile}}
{{/each}}
{{else}}
There are no other NPCs available to contribute.
{{/if}}

Generate a JSON array of contributions. Each contribution should be an object with "npcName" and "response".
Only include NPCs who are actively contributing something meaningful. If an NPC has nothing significant to add, do not include them in the output array.
If multiple NPCs have something to say, provide all their contributions. If no other NPCs have a relevant contribution, return an empty array.

Example of expected output format if NPC_Alice and NPC_Bob contribute:
[
  {
    "npcName": "NPC_Alice",
    "response": "Building on what {{leadingNpcContribution.npcName}} said, I think..."
  },
  {
    "npcName": "NPC_Bob",
    "response": "That's an interesting point, user. From my perspective as a {{this.profile}}, I'd also consider..."
  }
]

If no other NPCs contribute, the output should be:
[]
`,
});

const collaborativeDiscussionFlow = ai.defineFlow(
  {
    name: 'collaborativeDiscussionFlow',
    inputSchema: CollaborativeDiscussionInputSchema,
    outputSchema: CollaborativeDiscussionOutputSchema,
  },
  async (input): Promise<CollaborativeDiscussionOutput> => {
    if (input.otherNpcProfiles.length === 0) {
      console.log('No other NPC profiles to process, returning empty array.');
      return [];
    }

    try {
      console.log('Calling collaborativeDiscussionPrompt...');
      // We keep { stream: true } as it was in your setup when the error occurred.
      const genkitResponse = await collaborativeDiscussionPrompt(input, { stream: true });

      // console.log('Result from prompt call (genkitResponse object):', genkitResponse);

      let structuredOutput: CollaborativeDiscussionOutput | undefined = undefined;

      // Manually parse the JSON output since genkitResponse.output() is not a function.
      if (
        genkitResponse &&
        genkitResponse.message &&
        genkitResponse.message.content &&
        Array.isArray(genkitResponse.message.content) &&
        genkitResponse.message.content.length > 0 &&
        genkitResponse.message.content[0] &&
        typeof genkitResponse.message.content[0].text === 'string'
      ) {
        const jsonString = genkitResponse.message.content[0].text;
        console.log('Raw JSON string from model:', jsonString);
        try {
          const parsedJson = JSON.parse(jsonString);
          // Validate and parse the JSON with your Zod schema.
          // This will throw an error if parsing/validation fails.
          structuredOutput = CollaborativeDiscussionOutputSchema.parse(parsedJson);
        } catch (parsingError) {
          console.error('Error parsing JSON string or validating with Zod schema:', parsingError);
          // structuredOutput remains undefined and will be handled below.
        }
      } else {
        console.error('Could not find raw JSON text in genkitResponse.message.content[0].text to parse.');
      }

      if (structuredOutput === undefined) {
        console.error('Failed to obtain and parse structured output from the LLM response.');
        return []; // Fallback to an empty array.
      }

      // If Zod parsing was successful, structuredOutput is now correctly typed and validated.
      console.log('Successfully obtained and parsed output:', structuredOutput);
      return structuredOutput;

    } catch (error) {
      console.error('Error in collaborativeDiscussionFlow:', error);
      if (error instanceof Error) {
        console.error(`Error details: Name: ${error.name}, Message: ${error.message}`, error.stack);
      }
      return []; // Fallback to empty array on error.
    }
  }
);