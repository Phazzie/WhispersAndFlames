import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { MAX_REQUEST_SIZE, RATE_LIMIT_GAME_JOIN, RATE_LIMIT_WINDOW_MS } from '@/lib/api-constants';
import { auth } from '@/lib/auth';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/game-utils';
import { validateCsrf } from '@/lib/middleware/csrf';
import { PLAYER_NAME_MAX_LENGTH, sanitizePlayerName } from '@/lib/player-validation';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

const joinGameSchema = z.object({
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

    // Rate limiting: 20 join attempts per minute per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`game-join:${clientIp}`, RATE_LIMIT_GAME_JOIN, RATE_LIMIT_WINDOW_MS)) {
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

    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session?.value) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const user = await auth.getCurrentUser(session.value);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      );
    }

    // Validate CSRF token
    const csrfError = validateCsrf(request, session.value);
    if (csrfError) {
      logger.warn('CSRF validation failed', { userId: user.id, endpoint: 'game/join' });
      return csrfError;
    }

    const body = await request.json();
    const { roomCode, playerName } = joinGameSchema.parse(body);

    const game = await storage.games.get(roomCode);
    if (!game) {
      logger.info('Join failed: game not found', { roomCode, userId: user.id });
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // Check if user already in game
    if (game.playerIds.includes(user.id)) {
      logger.info('User already in game', { roomCode, userId: user.id });
      return NextResponse.json({ game }, { status: 200 });
    }

    // Add player to game
    const updatedGame = await storage.games.update(roomCode, {
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

    logger.info('Player joined game', { roomCode, userId: user.id, playerName });

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Join game validation failed', { error: error.errors });
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    logger.error('Failed to join game', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to join game' } },
      { status: 500 }
    );
  }
}
