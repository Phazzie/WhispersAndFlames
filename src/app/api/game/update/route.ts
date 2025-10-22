import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import type { GameState } from '@/lib/game-types';
import { storage } from '@/lib/storage';

const updateGameSchema = z.object({
  roomCode: z.string().min(4),
  updates: z.record(z.any()),
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
    const { roomCode, updates } = updateGameSchema.parse(body);

    const game = storage.games.get(roomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify user is in the game
    if (!game.playerIds.includes(user.id)) {
      return NextResponse.json({ error: 'Not in this game' }, { status: 403 });
    }

    const updatedGame = storage.games.update(roomCode, updates as Partial<GameState>);

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}
