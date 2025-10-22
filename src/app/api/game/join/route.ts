import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';

const joinGameSchema = z.object({
  roomCode: z.string().min(4),
  playerName: z.string().min(1),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const { roomCode, playerName } = joinGameSchema.parse(body);

    const game = storage.games.get(roomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user already in game
    if (game.playerIds.includes(user.id)) {
      return NextResponse.json({ game }, { status: 200 });
    }

    // Add player to game
    const updatedGame = storage.games.update(roomCode, {
      players: [
        ...game.players,
        {
          id: user.id,
          name: playerName,
          email: user.email,
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [...game.playerIds, user.id],
    });

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
