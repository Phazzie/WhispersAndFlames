import { describe, it, expect } from 'vitest';

describe('env validation', () => {
  it('should validate valid environment', async () => {
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();

    expect(env).toHaveProperty('NODE_ENV');
    expect(env).toHaveProperty('NEXT_PUBLIC_APP_URL');
  });

  it('should have optional API keys', async () => {
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();

    // API keys are optional
    expect(env).toHaveProperty('XAI_API_KEY');
    expect(env).toHaveProperty('GEMINI_API_KEY');
  });
});
