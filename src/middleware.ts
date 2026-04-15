import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

function getNormalizedOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getVercelOrigin(): string | null {
  const vercelUrl = process.env.VERCEL_URL;

  if (!vercelUrl) {
    return null;
  }

  try {
    return new URL(vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`).origin;
  } catch {
    return null;
  }
}

function isAllowedCsrfRequest(request: Request & { nextUrl: URL }): boolean {
  const allowedOrigins = new Set<string>([request.nextUrl.origin]);
  const appOrigin = getNormalizedOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null);
  const vercelOrigin = getVercelOrigin();

  if (appOrigin) {
    allowedOrigins.add(appOrigin);
  }

  if (vercelOrigin) {
    allowedOrigins.add(vercelOrigin);
  }

  const origin = getNormalizedOrigin(request.headers.get('origin'));
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const refererOrigin = getNormalizedOrigin(request.headers.get('referer'));
  if (refererOrigin) {
    return allowedOrigins.has(refererOrigin);
  }

  const host = request.headers.get('host');
  return host === request.nextUrl.host;
}

export default clerkMiddleware(async (auth, request) => {
  // CSRF protection for game API POST routes
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/api/game/')) {
    if (!isAllowedCsrfRequest(request)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV === 'development';

  // Core Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://placehold.co https://images.unsplash.com https://picsum.photos https://storage.googleapis.com https://img.clerk.com; font-src 'self' data:; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;";

  response.headers.set('Content-Security-Policy', csp);

  // HSTS in production
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
