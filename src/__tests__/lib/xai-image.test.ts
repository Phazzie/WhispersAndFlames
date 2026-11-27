import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { XAI_API_KEY: 'xai-test-key' } }));

import { generateImageFromPrompt } from '@/lib/xai-image';

describe('generateImageFromPrompt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.XAI_IMAGE_MODEL;
  });

  it('posts the prompt to the xAI images endpoint and returns the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ url: 'https://imgen.x.ai/img.jpg' }] }), {
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const url = await generateImageFromPrompt('Two flames, oil on canvas');

    expect(url).toBe('https://imgen.x.ai/img.jpg');
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://api.x.ai/v1/images/generations');
    expect(init.headers.Authorization).toBe('Bearer xai-test-key');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'grok-2-image',
      prompt: 'Two flames, oil on canvas',
      n: 1,
      response_format: 'url',
    });
  });

  it('honours XAI_IMAGE_MODEL', async () => {
    process.env.XAI_IMAGE_MODEL = 'grok-imagine-image';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ url: 'https://imgen.x.ai/a.jpg' }] }), {
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateImageFromPrompt('prompt');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('grok-imagine-image');
  });

  it('throws when the API answers with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })));
    await expect(generateImageFromPrompt('prompt')).rejects.toThrow('status 401');
  });

  it('throws when no usable URL comes back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }))
    );
    await expect(generateImageFromPrompt('prompt')).rejects.toThrow('https image URL');
  });
});
