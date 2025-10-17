import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (session?.value) {
    await auth.signOut(session.value);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', { maxAge: 0, path: '/' });

  return response;
}
