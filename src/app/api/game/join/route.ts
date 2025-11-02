import { NextResponse } from 'next/server';
import { z } from 'zod';

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
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const game = await storage.games.get(roomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (game.playerIds.includes(playerId)) {
      return NextResponse.json({ game }, { status: 200 });
    }

    if (game.players.length >= 3) {
      return NextResponse.json({ error: 'Room is already full' }, { status: 403 });
    }

    const updatedGame = await storage.games.update(roomCode, {
      players: [
        ...game.players,
        {
          id: playerId,
          name: trimmedName,
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [...game.playerIds, playerId],
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
