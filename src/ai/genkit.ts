import { openAI } from '@genkit-ai/openai';
import { genkit } from 'genkit';

// Lazy initialization to avoid module-load errors
// API key validation happens at runtime when AI is first used
let aiInstance: ReturnType<typeof genkit> | null = null;

function getAI() {
  if (aiInstance) return aiInstance;

  // Validate XAI API key at runtime (not module-load)
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'XAI_API_KEY environment variable is required. Get one from https://console.x.ai/'
    );
  }

  // xAI is OpenAI-compatible, so we use the OpenAI plugin with xAI's base URL
  aiInstance = genkit({
    plugins: [
      openAI({
        apiKey,
        baseUrl: 'https://api.x.ai/v1', // xAI's OpenAI-compatible endpoint
      }),
    ],
    model: 'openai/grok-beta', // xAI's Grok model
  });

  return aiInstance;
}

// Export ai as a getter to ensure lazy initialization
export const ai = new Proxy({} as ReturnType<typeof genkit>, {
  get(_, prop) {
    const instance = getAI();
    return instance[prop as keyof typeof instance];
  },
});
