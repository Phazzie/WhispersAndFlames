import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.XAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
