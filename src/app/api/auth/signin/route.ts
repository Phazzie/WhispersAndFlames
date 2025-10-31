import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per minute per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`signin:${clientIp}`, 5, 60000)) {
      return NextResponse.json(
        { error: 'Too many sign in attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = signinSchema.parse(body);

    const { token } = await auth.signIn(email, password);
    const user = await auth.getCurrentUser(token);

    const response = NextResponse.json({ user }, { status: 200 });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Sign in failed' }, { status: 401 });
  }
}
