import { env } from '@/lib/env';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('xai-image');

/** Host xAI serves generated images from. Must stay in the CSP img-src list. */
export const XAI_IMAGE_HOST = 'https://imgen.x.ai';

const XAI_IMAGES_ENDPOINT = 'https://api.x.ai/v1/images/generations';
const DEFAULT_IMAGE_MODEL = 'grok-2-image';
const MAX_PROMPT_LENGTH = 1000;

type XaiImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
};

/**
 * Renders an image prompt with xAI's image API (same XAI_API_KEY as the text
 * models) and returns a URL the browser can load. Throws on any failure so the
 * caller can decide on a fallback.
 */
export async function generateImageFromPrompt(prompt: string): Promise<string> {
  const model = process.env.XAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  const response = await fetch(XAI_IMAGES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, MAX_PROMPT_LENGTH),
      n: 1,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error('xAI image request failed', undefined, {
      status: response.status,
      model,
      detail: detail.slice(0, 300),
    });
    throw new Error(`xAI image request failed with status ${response.status}`);
  }

  const body = (await response.json()) as XaiImageResponse;
  const url = body.data?.[0]?.url;
  if (!url || !url.startsWith('https://')) {
    throw new Error('xAI image response did not include an https image URL');
  }
  return url;
}
