import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = auth.getCurrentUser(session.value);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomCode } = await params;
    const game = storage.games.get(roomCode);

    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
