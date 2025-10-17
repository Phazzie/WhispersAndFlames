import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session?.value) {
    return NextResponse.json({ user: null });
  }

  const user = auth.getCurrentUser(session.value);
  return NextResponse.json({ user: user || null });
}
