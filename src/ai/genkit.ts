import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Validate XAI API key is set
const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
  throw new Error(
    'XAI_API_KEY environment variable is required. Get one from https://console.x.ai/'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
