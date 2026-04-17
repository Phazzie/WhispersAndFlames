import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  MAX_REQUEST_SIZE,
  RATE_LIMIT_GAME_UPDATE,
  RATE_LIMIT_WINDOW_MS,
  MAX_ANSWER_LENGTH,
} from '@/lib/api-constants';
import type { GameState, Player } from '@/lib/game-types';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';
import {
  getRateLimitIdentifier,
  RateLimiter,
  createRateLimitResponse,
} from '@/lib/utils/rate-limiter';
import { sanitizeHtml, truncateInput } from '@/lib/utils/security';

const updateGameRateLimiter = new RateLimiter(RATE_LIMIT_GAME_UPDATE, RATE_LIMIT_WINDOW_MS / 60000);

const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isReady: z.boolean(),
  email: z.string(),
  selectedCategories: z.array(z.string()),
  selectedSpicyLevel: z.enum(['Mild', 'Medium', 'Hot', 'Extra-Hot']).optional(),
});

const gameRoundSchema = z.object({
  question: z.string(),
  answers: z.record(z.string(), z.string()).default({}),
});

const visualMemorySchema = z.object({
  imageUrl: z.string(),
  prompt: z.string(),
  timestamp: z.number().int().nonnegative(),
});

const updateGameSchema = z.object({
  roomCode: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .transform((value) => value.toUpperCase()),
  updates: z
    .object({
      step: z.enum(['lobby', 'categories', 'spicy', 'game', 'summary']).optional(),
      players: z.array(playerSchema).optional(),
      playerIds: z.array(z.string()).optional(),
      gameMode: z.enum(['online', 'local']).optional(),
      currentPlayerIndex: z.number().int().min(0).optional(),
      commonCategories: z.array(z.string()).optional(),
      finalSpicyLevel: z.enum(['Mild', 'Medium', 'Hot', 'Extra-Hot']).optional(),
      chaosMode: z.boolean().optional(),
      gameRounds: z.array(gameRoundSchema).optional(),
      currentQuestion: z.string().optional(),
      currentQuestionIndex: z.number().int().min(0).optional(),
      totalQuestions: z.number().int().min(0).optional(),
      summary: z.string().optional(),
      visualMemories: z.array(visualMemorySchema).optional(),
      imageGenerationCount: z.number().int().min(0).optional(),
      hostId: z.string().optional(),
    })
    .strict(),
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

    // Rate limiting: 60 updates per minute per IP (allows rapid gameplay)
    const clientIp = getRateLimitIdentifier(request);
    const rateLimit = updateGameRateLimiter.check(`game-update:${clientIp}`);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit, 'Too many requests. Please slow down.');
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
    const { roomCode, updates } = updateGameSchema.parse(body);

    const game = await storage.games.get(roomCode);
    if (!game) {
      logger.info('Update failed: game not found', { roomCode, userId });
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // Verify the authenticated user is a participant in this game
    const isParticipant = game.players.some((p: Player) => p.id === userId);
    if (!isParticipant) {
      logger.warn('Unauthorized game update attempt', { roomCode, userId });
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not in this game' } },
        { status: 403 }
      );
    }

    // Sanitize game rounds to prevent XSS
    const sanitizedUpdates = { ...updates };
    if (updates.gameRounds && Array.isArray(updates.gameRounds)) {
      sanitizedUpdates.gameRounds = updates.gameRounds.map((round) => {
        const sanitizedAnswers: Record<string, string> = {};
        for (const [playerId, answer] of Object.entries(round.answers || {})) {
          sanitizedAnswers[playerId] = sanitizeHtml(truncateInput(answer, MAX_ANSWER_LENGTH));
        }
        return { ...round, answers: sanitizedAnswers };
      });
    }

    const updatedGame = await storage.games.update(
      roomCode,
      sanitizedUpdates as Partial<GameState>
    );

    logger.info('Game updated successfully', { roomCode, userId });

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Game update validation failed', { error: error.errors });
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    logger.error('Failed to update game', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update game' } },
      { status: 500 }
    );
  }
}
