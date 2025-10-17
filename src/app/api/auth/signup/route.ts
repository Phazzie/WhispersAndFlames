import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = signupSchema.parse(body);

    const { userId, token } = await auth.signUp(email, password);

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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 400 }
    );
  }
}
