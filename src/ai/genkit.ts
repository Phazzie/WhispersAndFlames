import { openAI } from 'genkitx-openai';
import { genkit } from 'genkit';

import { env } from '@/lib/env';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    }),
  ],
  model: 'openai/grok-3',
});
