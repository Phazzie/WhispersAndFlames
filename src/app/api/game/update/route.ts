import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage-adapter';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { GameState } from '@/lib/game-types';
import { sanitizeHtml, truncateInput } from '@/lib/utils/security';

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

    const user = await auth.getCurrentUser(session.value);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, updates } = updateGameSchema.parse(body);

    const game = await storage.games.get(roomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify user is in the game
    if (!game.playerIds.includes(user.id)) {
      return NextResponse.json({ error: 'Not in this game' }, { status: 403 });
    }

    // Sanitize game rounds to prevent XSS
    const sanitizedUpdates = { ...updates };
    if (updates.gameRounds && Array.isArray(updates.gameRounds)) {
      sanitizedUpdates.gameRounds = updates.gameRounds.map((round: any) => {
        if (round.answers && typeof round.answers === 'object') {
          const sanitizedAnswers: Record<string, string> = {};
          for (const [playerId, answer] of Object.entries(round.answers)) {
            if (typeof answer === 'string') {
              // Truncate to prevent DoS and sanitize HTML
              sanitizedAnswers[playerId] = sanitizeHtml(truncateInput(answer, 5000));
            } else {
              sanitizedAnswers[playerId] = answer as string;
            }
          }
          return { ...round, answers: sanitizedAnswers };
        }
        return round;
      });
    }

    const updatedGame = await storage.games.update(
      roomCode,
      sanitizedUpdates as Partial<GameState>
    );

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}
