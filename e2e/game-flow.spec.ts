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
});
