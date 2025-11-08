import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generates a cryptographically secure nonce for CSP
 * Used to allow specific inline scripts/styles in production
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Builds Content Security Policy header based on environment
 * Production: Strict CSP with nonces
 * Development: Relaxed CSP for hot reload and development tools
 */
function buildCSP(isDev: boolean, nonce?: string): string {
  // script-src configuration:
  // - 'self': Allow scripts from same origin
  // - 'unsafe-eval': ONLY in dev for Next.js hot reload and webpack
  // - 'unsafe-inline': ONLY in dev for development convenience
  // - nonce-{nonce}: In production, allow only scripts with matching nonce
  const scriptSrc = isDev
    ? "'self' 'unsafe-eval' 'unsafe-inline'"
    : nonce
      ? `'self' 'nonce-${nonce}'`
      : "'self'";

  // style-src configuration:
  // - 'unsafe-inline': Required for CSS-in-JS libraries and styled-components
  // - Consider migrating to nonce-based styles in future for stricter CSP
  const styleSrc = "'self' 'unsafe-inline'";

  // img-src configuration:
  // - 'self': Allow images from same origin
  // - data:: Allow data URLs for inline images
  // - External domains: Placeholder services and image CDNs used in the app
  const imgSrc =
    "'self' data: https://placehold.co https://images.unsplash.com https://picsum.photos https://storage.googleapis.com";

  return (
    "default-src 'self'; " + // Only allow resources from same origin by default
    `script-src ${scriptSrc}; ` +
    `style-src ${styleSrc}; ` +
    `img-src ${imgSrc}; ` +
    "font-src 'self' data:; " + // Allow fonts from same origin and data URLs
    "connect-src 'self'; " + // Only allow AJAX/WebSocket to same origin
    "object-src 'none'; " + // Block <object>, <embed>, <applet> (prevents Flash, Java, etc.)
    "base-uri 'self'; " + // Prevent base tag injection attacks
    "form-action 'self'; " + // Only allow form submissions to same origin
    "frame-ancestors 'none'; " + // Prevent clickjacking (same as X-Frame-Options: DENY)
    'upgrade-insecure-requests;' // Automatically upgrade HTTP to HTTPS
  );
}

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV === 'development';

  // Generate nonce for production CSP
  const nonce = isDev ? undefined : generateNonce();

  // Core Security Headers
  // X-Frame-Options: Prevents clickjacking by blocking iframe embedding
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Prevents MIME-type sniffing attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy: Don't leak referrer information to other sites
  response.headers.set('Referrer-Policy', 'no-referrer');

  // Permissions-Policy: Disable unnecessary browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content-Security-Policy: Strict control over resource loading
  response.headers.set('Content-Security-Policy', buildCSP(isDev, nonce));

  // HSTS (HTTP Strict-Transport-Security): Force HTTPS in production
  // Only set in production to avoid HTTPS requirement in local development
  // max-age=31536000: Remember for 1 year
  // includeSubDomains: Apply to all subdomains
  // preload: Eligible for browser preload lists
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Store nonce in response for use in script/style tags if needed
  if (nonce) {
    response.headers.set('X-Nonce', nonce);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
