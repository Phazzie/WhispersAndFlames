import { NextResponse } from 'next/server';

import { storage } from '@/lib/storage-adapter';

export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const playerId = request.headers.get('x-player-id');
    if (!playerId) {
      return NextResponse.json({ error: 'Missing player identifier' }, { status: 400 });
    }

    const { roomCode } = await params;
    const game = await storage.games.get(roomCode);

    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!game.playerIds.includes(playerId)) {
      return NextResponse.json({ error: 'Not in this game' }, { status: 403 });
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
