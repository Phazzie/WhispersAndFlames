import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { GameState } from '@/lib/game-types';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/game-utils';
import { isValidPlayerId, sanitizePlayerName } from '@/lib/player-validation';
import { storage } from '@/lib/storage-adapter';

const createGameSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, playerId, playerName } = createGameSchema.parse(body);
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

    const existing = await storage.games.get(normalizedRoomCode);
    if (existing) {
      return NextResponse.json({ error: 'Room code already in use' }, { status: 400 });
    }

    const initialState: GameState = {
      step: 'lobby',
      players: [
        {
          id: trimmedPlayerId,
          name: sanitizedName,
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [trimmedPlayerId],
      hostId: trimmedPlayerId,
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
      roomCode: normalizedRoomCode,
      createdAt: new Date().toISOString(),
    };

    const game = await storage.games.create(normalizedRoomCode, initialState);

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
