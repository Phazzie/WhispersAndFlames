import { NextResponse } from 'next/server';

import { isValidRoomCode, normalizeRoomCode } from '@/lib/game-utils';
import { isValidPlayerId } from '@/lib/player-validation';
import { storage } from '@/lib/storage-adapter';

export async function GET(request: Request, { params }: { params: { roomCode: string } }) {
  try {
    const rawPlayerId = request.headers.get('x-player-id')?.trim();
    if (!rawPlayerId || !isValidPlayerId(rawPlayerId)) {
      return NextResponse.json({ error: 'Missing player identifier' }, { status: 400 });
    }

    const normalizedRoomCode = normalizeRoomCode(params.roomCode ?? '');
    if (!isValidRoomCode(normalizedRoomCode)) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    const game = await storage.games.get(normalizedRoomCode);

    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!game.playerIds.includes(rawPlayerId)) {
      return NextResponse.json({ error: 'Not in this game' }, { status: 403 });
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
