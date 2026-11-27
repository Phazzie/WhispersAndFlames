import { expect, type Browser, type Page } from '@playwright/test';

/** Opens a fresh browser context signed in as `id` via the e2e Clerk fake. */
export async function signedInPage(browser: Browser, id: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: 'e2e_user',
      value: encodeURIComponent(`${id}|${id}@e2e.test`),
      url: 'http://localhost:9002',
    },
  ]);
  return context.newPage();
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Create New Room' }).click();
  await page.waitForURL(/\/game\/[A-Z0-9-]+$/);
  return decodeURIComponent(page.url().split('/game/')[1]);
}

export async function joinRoomByTyping(page: Page, name: string, roomCode: string) {
  await page.goto('/');
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByLabel('Room code').fill(roomCode);
  await page.getByRole('button', { name: 'Join' }).click();
  await page.waitForURL(new RegExp(`/game/${roomCode}$`));
}

/** Clicks on both pages at (nearly) the same moment to exercise races. */
export async function clickTogether(a: Page, b: Page, name: string | RegExp) {
  await Promise.all([
    a.getByRole('button', { name }).click(),
    b.getByRole('button', { name }).click(),
  ]);
}

export async function expectHeading(page: Page, text: string | RegExp) {
  await expect(page.getByRole('heading', { name: text })).toBeVisible();
}
