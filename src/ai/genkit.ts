import { googleAI } from '@genkit-ai/googleai';
import { genkit, Genkit } from 'genkit';

let aiInstance: Genkit | null = null;

function initializeAI(): Genkit {
  // Validate XAI API key is set
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'XAI_API_KEY environment variable is required. Get one from https://console.x.ai/'
    );
  }

  return genkit({
    plugins: [
      googleAI({
        apiKey,
      }),
    ],
    model: 'googleai/gemini-2.5-flash',
  });
}

// Lazy initialization: only create the AI instance when accessed
export const ai = new Proxy({} as Genkit, {
  get(_target, prop) {
    if (!aiInstance) {
      aiInstance = initializeAI();
    }
    return aiInstance[prop as keyof Genkit];
  },
});
