import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { MAX_REQUEST_SIZE } from '@/lib/api-constants';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/middleware/csrf';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

export async function POST(request: Request) {
  try {
    // Check request body size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } },
        { status: 413 }
      );
    }

    // Rate limiting: 10 signout attempts per minute per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`signout:${clientIp}`, 10, 60000)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    // If no session exists, just return success (already signed out)
    if (!session?.value) {
      logger.info('Sign out called with no active session');
      const response = NextResponse.json({ success: true });
      response.cookies.set('session', '', { maxAge: 0, path: '/' });
      return response;
    }

    // Validate CSRF token for authenticated signout
    const csrfError = validateCsrf(request, session.value);
    if (csrfError) {
      logger.warn('CSRF validation failed', { endpoint: 'auth/signout' });
      return csrfError;
    }

    // Get user info for logging before signing out
    const user = await auth.getCurrentUser(session.value);
    const userId = user?.id;

    await auth.signOut(session.value);

    logger.info('User signed out successfully', { userId });

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', { maxAge: 0, path: '/' });

    return response;
  } catch (error) {
    logger.error('Sign out failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Sign out failed' } },
      { status: 500 }
    );
  }
}
