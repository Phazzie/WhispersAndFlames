import { NextResponse } from 'next/server';
import { z } from 'zod';

import { MAX_PLAYERS } from '@/lib/constants';
import { normalizeRoomCode, isValidRoomCode } from '@/lib/game-utils';
import { isValidPlayerId, sanitizePlayerName } from '@/lib/player-validation';
import { storage } from '@/lib/storage-adapter';

const joinGameSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, playerId, playerName } = joinGameSchema.parse(body);
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(normalizedRoomCode)) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    const trimmedPlayerId = playerId.trim();
    if (!isValidPlayerId(trimmedPlayerId)) {
      return NextResponse.json({ error: 'Invalid player identifier' }, { status: 400 });
    }

    const sanitizedName = sanitizePlayerName(playerName);
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const game = await storage.games.get(normalizedRoomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (game.playerIds.includes(trimmedPlayerId)) {
      return NextResponse.json({ game }, { status: 200 });
    }

    if (game.players.length >= MAX_PLAYERS) {
      return NextResponse.json({ error: 'Room is already full' }, { status: 403 });
    }

    const updatedGame = await storage.games.update(normalizedRoomCode, {
      players: [
        ...game.players,
        {
          id: trimmedPlayerId,
          name: sanitizedName,
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [...game.playerIds, trimmedPlayerId],
    });

    if (!updatedGame) {
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
