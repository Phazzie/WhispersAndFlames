import { NextResponse } from 'next/server';
import { z } from 'zod';

import { MAX_REQUEST_SIZE, SESSION_EXPIRY_DAYS } from '@/lib/api-constants';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

    // Rate limiting: 3 signup attempts per hour per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`signup:${clientIp}`, 3, 3600000)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many signup attempts. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = signupSchema.parse(body);

    const { userId, token } = await auth.signUp(email, password);

    logger.info('User signed up successfully', { userId, email });

    const response = NextResponse.json(
      {
        user: { id: userId, email },
      },
      { status: 201 }
    );

    // Set session cookie
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
      logger.warn('Sign up validation failed', { error: error.errors });
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    logger.warn('Sign up failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: {
          code: 'SIGNUP_FAILED',
          message: error instanceof Error ? error.message : 'Signup failed',
        },
      },
      { status: 400 }
    );
  }
}
