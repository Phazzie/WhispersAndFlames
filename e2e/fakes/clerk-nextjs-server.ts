/**
 * Stand-in for `@clerk/nextjs/server` used by the e2e suite (see clerk-shared.ts).
 */
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { E2E_USER_COOKIE, parseUserCookie } from './clerk-shared';

export async function auth() {
  const store = await cookies();
  const user = parseUserCookie(store.get(E2E_USER_COOKIE)?.value);
  return { userId: user?.id ?? null };
}

export function createRouteMatcher(patterns: string[]) {
  const regexes = patterns.map((p) => new RegExp(`^${p}$`));
  return (request: NextRequest) => regexes.some((r) => r.test(request.nextUrl.pathname));
}

class ProtectRedirect extends Error {}

type Handler = (
  authFn: { protect: () => Promise<void> },
  request: NextRequest
) => Promise<Response | undefined | void>;

export function clerkMiddleware(handler: Handler) {
  return async (request: NextRequest) => {
    const user = parseUserCookie(request.cookies.get(E2E_USER_COOKIE)?.value);
    const authFn = {
      protect: async () => {
        if (!user) throw new ProtectRedirect();
      },
    };
    try {
      return (await handler(authFn, request)) ?? NextResponse.next();
    } catch (error) {
      if (error instanceof ProtectRedirect) {
        // Real Clerk 404s protected API calls and redirects pages to sign-in.
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return new NextResponse('Not found', { status: 404 });
        }
        return NextResponse.redirect(new URL('/', request.url));
      }
      throw error;
    }
  };
}
