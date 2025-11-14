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

  it('should have optional API keys', async () => {
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();

    // API keys are optional
    expect(env).toHaveProperty('XAI_API_KEY');
    expect(env).toHaveProperty('GEMINI_API_KEY');
  });
});
