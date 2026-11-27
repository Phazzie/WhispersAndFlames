/**
 * Stand-in for `@/lib/xai-image` used by the e2e suite: returns a tiny inline
 * PNG instead of calling the xAI image API.
 */
export const XAI_IMAGE_HOST = 'https://imgen.x.ai';

// 1x1 transparent PNG
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export async function generateImageFromPrompt(_prompt: string): Promise<string> {
  return PIXEL;
}
