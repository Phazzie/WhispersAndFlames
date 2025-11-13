import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { GameState } from '@/lib/game-types';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/game-utils';
import { PLAYER_NAME_MAX_LENGTH, sanitizePlayerName } from '@/lib/player-validation';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

const MAX_REQUEST_SIZE = 1_000_000; // 1MB

const createGameSchema = z.object({
  roomCode: z
    .string()
    .min(4)
    .max(64)
    .transform(normalizeRoomCode)
    .refine(isValidRoomCode, 'Invalid room code format'),
  playerName: z.string().min(1).max(PLAYER_NAME_MAX_LENGTH).transform(sanitizePlayerName),
});

export async function POST(request: Request) {
  try {
    // Check request body size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } },
        { status: 413 }
      );
    }

    // Rate limiting: 10 game creations per minute per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`game-create:${clientIp}`, 10, 60000)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    // Clerk authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { roomCode, playerName } = createGameSchema.parse(body);

    // Check if room already exists
    const existing = await storage.games.get(roomCode);
    if (existing) {
      logger.info('Game creation failed: room code in use', { roomCode, userId });
      return NextResponse.json(
        { error: { code: 'ROOM_CODE_IN_USE', message: 'Room code already in use' } },
        { status: 400 }
      );
    }

    // Create initial game state
    const initialState: GameState = {
      step: 'lobby',
      players: [
        {
          id: userId,
          name: playerName,
          email: '', // Clerk handles email separately
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [userId],
      hostId: userId,
      gameMode: 'online',
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
    };

    const game = await storage.games.create(roomCode, initialState);

    logger.info('Game created successfully', { roomCode, userId, playerName });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Game creation validation failed', { error: error.errors });
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    logger.error('Game creation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create game' } },
      { status: 500 }
    );
  }
}
