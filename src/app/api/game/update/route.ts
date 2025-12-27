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

const updateGameSchema = z.object({
  roomCode: z.string().min(4),
  // #TODO: Improve type safety here. z.any() allows anything. Define a strict schema for GameState updates.
  // See #TODO.md "Code Quality" section.
  updates: z.record(z.any()),
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
        const roundRecord = round as Record<string, unknown>;
        if (roundRecord.answers && typeof roundRecord.answers === 'object') {
          const sanitizedAnswers: Record<string, string> = {};
          for (const [playerId, answer] of Object.entries(
            roundRecord.answers as Record<string, unknown>
          )) {
            if (typeof answer === 'string') {
              // Truncate to prevent DoS and sanitize HTML
              sanitizedAnswers[playerId] = sanitizeHtml(truncateInput(answer, MAX_ANSWER_LENGTH));
            } else {
              sanitizedAnswers[playerId] = answer as string;
            }
          }
          return { ...roundRecord, answers: sanitizedAnswers };
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
