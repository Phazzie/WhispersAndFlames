import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session?.value) {
    return NextResponse.json({ user: null });
  }

  const user = await auth.getCurrentUser(session.value);
  return NextResponse.json({ user: user || null });
}
