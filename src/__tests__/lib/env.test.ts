import { beforeEach, describe, it, expect, vi } from 'vitest';

describe('env validation', () => {
  beforeEach(() => {
    // Mock required Clerk environment variables for tests
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'test-clerk-publishable-key');
    vi.stubEnv('CLERK_SECRET_KEY', 'test-clerk-secret-key');
  });

  it('should validate valid environment', async () => {
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();

    expect(env).toHaveProperty('NODE_ENV');
    expect(env).toHaveProperty('NEXT_PUBLIC_APP_URL');
    expect(env).toHaveProperty('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    expect(env).toHaveProperty('CLERK_SECRET_KEY');
  });

  it('should expose the required xAI API key', async () => {
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();

    expect(env).toHaveProperty('XAI_API_KEY');
  });

  it('should reject an environment with no XAI_API_KEY', async () => {
    // Guards the required-key contract: src/ai/genkit.ts reads env.XAI_API_KEY
    // with no fallback, so a regression back to .optional() would let a
    // key-less deploy boot and then fail at question-generation time instead.
    vi.stubEnv('XAI_API_KEY', '');

    const { validateEnv } = await import('@/lib/env');

    expect(() => validateEnv()).toThrow('Invalid environment configuration');
  });

  it('should reject an environment with no Clerk secret key', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '');

    const { validateEnv } = await import('@/lib/env');

    expect(() => validateEnv()).toThrow('Invalid environment configuration');
  });
});
