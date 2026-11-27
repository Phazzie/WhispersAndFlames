import { defineConfig, devices } from '@playwright/test';

const PORT = 9002;

// The suite runs against `next dev` with E2E_FAKE_SERVICES=1, which swaps
// Clerk and the xAI calls for the fakes in e2e/fakes. No real accounts, keys
// or network are needed, so it runs the same locally and in CI.
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['fakes/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optional: point at a preinstalled Chromium instead of Playwright's own.
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      E2E_FAKE_SERVICES: '1',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_e2e_fake',
      CLERK_SECRET_KEY: 'sk_test_e2e_fake',
      XAI_API_KEY: 'xai-e2e-fake',
      DISABLE_DATABASE: 'true',
    },
  },
});
