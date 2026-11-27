/**
 * Shared helpers for the e2e Clerk fake. The signed-in test user is carried in
 * a plain cookie (`e2e_user=<id>|<email>`) that Playwright sets per browser
 * context, so two contexts can play as two different partners.
 *
 * This file is only ever bundled when E2E_FAKE_SERVICES=1 under `next dev`;
 * next.config.mjs refuses to apply the aliases in a production build.
 */
export const E2E_USER_COOKIE = 'e2e_user';

export type FakeUser = { id: string; email: string };

export function parseUserCookie(raw: string | undefined | null): FakeUser | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  const [id, email] = decoded.split('|');
  if (!id) return null;
  return { id, email: email || `${id}@e2e.test` };
}
