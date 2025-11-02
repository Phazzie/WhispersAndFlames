import { NextResponse } from 'next/server';
import { z } from 'zod';

import { storage } from '@/lib/storage-adapter';
import type { GameState } from '@/lib/game-types';

const createGameSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, playerId, playerName } = createGameSchema.parse(body);
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const existing = await storage.games.get(roomCode);
    if (existing) {
      return NextResponse.json({ error: 'Room code already in use' }, { status: 400 });
    }

    const initialState: GameState = {
      step: 'lobby',
      players: [
        {
          id: playerId,
          name: trimmedName,
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [playerId],
      hostId: playerId,
      commonCategories: [],
      finalSpicyLevel: 'Mild',
      chaosMode: false,
      gameRounds: [],
      currentQuestion: '',
      currentQuestionIndex: 0,
      totalQuestions: 0,
      summary: '',
      visualMemories: [],
      imageGenerationCount: 0,
      roomCode,
      createdAt: new Date().toISOString(),
    };

    const game = await storage.games.create(roomCode, initialState);

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
