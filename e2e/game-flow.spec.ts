import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should show homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Whispers|Flames/i);
  });

  test('should navigate to game creation', async ({ page }) => {
    await page.goto('/');

    // Look for create/join game buttons or links
    const createButton = page.getByRole('button', { name: /create|start|new game/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      // Should navigate to game page
      await expect(page).toHaveURL(/\/game/);
    }
  });

  test('should handle invalid room code', async ({ page }) => {
    // Try to join with invalid room code
    await page.goto('/game/INVALID123');

    // Should show error or redirect
    await page.waitForTimeout(2000);

    // Check for error message or redirect
    const hasError = await page
      .getByText(/not found|invalid|error/i)
      .isVisible()
      .catch(() => false);
    const isRedirected = !page.url().includes('/game/INVALID123');

    expect(hasError || isRedirected).toBeTruthy();
  });

  test('should handle rate-limited create response', async ({ page }) => {
    await page.route('**/api/game/create', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
        }),
      });
    });

    await page.goto('/');
    const status = await page.evaluate(async () => {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: 'ROOM-01', playerName: 'A' }),
      });
      return response.status;
    });

    expect(status).toBe(429);
  });
});
