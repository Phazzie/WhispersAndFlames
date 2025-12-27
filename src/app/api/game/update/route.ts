import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  MAX_REQUEST_SIZE,
  RATE_LIMIT_GAME_UPDATE,
  RATE_LIMIT_WINDOW_MS,
  MAX_ANSWER_LENGTH,
} from '@/lib/api-constants';
import type { GameState } from '@/lib/game-types';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';
import { sanitizeHtml, truncateInput, checkRateLimit, getClientIp } from '@/lib/utils/security';

const GameStepSchema = z.enum(['lobby', 'categories', 'spicy', 'game', 'summary']);
const GameModeSchema = z.enum(['online', 'local']);
const SpicyLevelNameSchema = z.enum(['Mild', 'Medium', 'Hot', 'Extra-Hot']);

const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isReady: z.boolean(),
  email: z.string(),
  selectedCategories: z.array(z.string()),
  selectedSpicyLevel: SpicyLevelNameSchema.optional(),
});

const GameRoundSchema = z.object({
  question: z.string(),
  answers: z.record(z.string()),
});

const VisualMemorySchema = z.object({
  imageUrl: z.string(),
  prompt: z.string(),
  timestamp: z.number(),
});

export const GameStateSchema = z.object({
  step: GameStepSchema,
  players: z.array(PlayerSchema),
  playerIds: z.array(z.string()),
  hostId: z.string(),
  gameMode: GameModeSchema,
  currentPlayerIndex: z.number().optional(),
  commonCategories: z.array(z.string()),
  finalSpicyLevel: SpicyLevelNameSchema,
  chaosMode: z.boolean(),
  gameRounds: z.array(GameRoundSchema),
  currentQuestion: z.string(),
  currentQuestionIndex: z.number(),
  totalQuestions: z.number(),
  summary: z.string(),
  visualMemories: z.array(VisualMemorySchema).optional(),
  imageGenerationCount: z.number(),
  roomCode: z.string(),
  createdAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export const updateGameSchema = z.object({
  roomCode: z.string().min(4),
  updates: GameStateSchema.partial(),
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
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`game-update:${clientIp}`, RATE_LIMIT_GAME_UPDATE, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' } },
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
    const { roomCode, updates } = updateGameSchema.parse(body);

    const game = await storage.games.get(roomCode);
    if (!game) {
      logger.info('Update failed: game not found', { roomCode, userId });
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // Verify user is in the game
    if (!game.playerIds.includes(userId)) {
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
        // Since we are now using a strict schema, round is typed as infer<typeof GameRoundSchema>
        // But the previous code treated it as unknown.
        // We can trust Zod to have validated the structure.

        // However, we still need to sanitize the strings in answers.
        if (round && round.answers) {
           const sanitizedAnswers: Record<string, string> = {};
           for (const [playerId, answer] of Object.entries(round.answers)) {
             // Zod ensures answer is a string
             sanitizedAnswers[playerId] = sanitizeHtml(truncateInput(answer, MAX_ANSWER_LENGTH));
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
