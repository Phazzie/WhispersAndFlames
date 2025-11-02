import { NextResponse } from 'next/server';
import { z } from 'zod';

import { storage } from '@/lib/storage-adapter';
import type { GameState } from '@/lib/game-types';
import { sanitizeHtml, truncateInput } from '@/lib/utils/security';

const updateGameSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  updates: z.record(z.any()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, playerId, updates } = updateGameSchema.parse(body);

    const game = await storage.games.get(roomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!game.playerIds.includes(playerId)) {
      return NextResponse.json({ error: 'Not in this game' }, { status: 403 });
    }

    const sanitizedUpdates = { ...updates };
    if (updates.gameRounds && Array.isArray(updates.gameRounds)) {
      sanitizedUpdates.gameRounds = updates.gameRounds.map((round: any) => {
        if (round.answers && typeof round.answers === 'object') {
          const sanitizedAnswers: Record<string, string> = {};
          for (const [id, answer] of Object.entries(round.answers)) {
            if (typeof answer === 'string') {
              sanitizedAnswers[id] = sanitizeHtml(truncateInput(answer, 5000));
            } else {
              sanitizedAnswers[id] = answer as string;
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

    if (!updatedGame) {
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}
