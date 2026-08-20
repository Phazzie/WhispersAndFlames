import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Mock required environment variables for all tests.
// These must cover every key marked required in src/lib/env.ts, or importing
// any module that touches `env` fails validation at module load.
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-publishable-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret-key';
process.env.XAI_API_KEY = 'test-xai-key';

// Setup for tests
beforeAll(() => {
  // Test environment is already set
});

afterEach(() => {
  // Cleanup after each test
});

afterAll(() => {
  // Final cleanup
});
