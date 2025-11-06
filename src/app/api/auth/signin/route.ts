import { NextResponse } from 'next/server';
import { z } from 'zod';

import { MAX_REQUEST_SIZE, SESSION_EXPIRY_DAYS } from '@/lib/api-constants';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

    // Rate limiting: 5 attempts per minute per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`signin:${clientIp}`, 5, 60000)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many sign in attempts. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = signinSchema.parse(body);

    const { token } = await auth.signIn(email, password);
    const user = await auth.getCurrentUser(token);

    logger.info('User signed in successfully', { userId: user?.id, email });

    const response = NextResponse.json({ user }, { status: 200 });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Sign in validation failed', { error: error.errors });
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    logger.warn('Sign in failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: { code: 'SIGNIN_FAILED', message: 'Sign in failed' } },
      { status: 401 }
    );
  }
}
