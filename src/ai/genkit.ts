import { openAI } from 'genkitx-openai';
import { genkit } from 'genkit';

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
  throw new Error(
    'XAI_API_KEY environment variable is required. Get one from https://console.x.ai/'
  );
}

export const ai = genkit({
  plugins: [
    openAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    }),
  ],
  model: 'openai/grok-3',
});
