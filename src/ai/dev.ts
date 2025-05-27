
import { config } from 'dotenv';
config();

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';

// Make sure these imports match your file paths and export names
import { generateSingleNpcResponse } from './flows/generate-single-npc-response-flow';
import { generateNpcContinuation } from './flows/generate-npc-continuation-flow';
import { prioritizeNPCResponse } from './flows/prioritize-npc-response'; // Assuming this is also a flow
import { collaborativeDiscussion } from './flows/enable-collaborative-discussion'; // Assuming this is also a flow
import { generateUserReengagement } from './flows/generate-user-reengagement-flow'; // Assuming this is also a flow


export default ai;
