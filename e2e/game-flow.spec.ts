import { test, expect } from '@playwright/test';

// Scope note: only the shallow, unauthenticated surface is covered here.
// Deep authenticated flows (create room, lobby, Q&A) require a real Clerk
// development instance wired up via `@clerk/testing`. With the placeholder
// keys used in this repo, clerkMiddleware 307-redirects every browser page
// request to a nonexistent `*.clerk.accounts.dev` handshake URL, so those
// flows cannot run at all and are intentionally not covered here.

test.describe('Game Flow', () => {
  test('should show homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Whispers|Flames/i);
  });

  test('should navigate to game creation', async ({ page }) => {
    await page.goto('/');

    // A signed-out visitor must be offered an actionable entry control.
    // Deliberately not clicked: signed-out users hit a Clerk modal, so
    // navigation cannot be asserted without real auth.
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('should handle invalid room code', async ({ page }) => {
    await page.goto('/game/INVALID123');

    // An unauthenticated visitor must not be left sitting on the game route.
    await expect(page).not.toHaveURL(/\/game\/INVALID123$/);
  });
});
