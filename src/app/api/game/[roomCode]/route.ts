import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { RATE_LIMIT_GAME_GET, RATE_LIMIT_WINDOW_MS } from '@/lib/api-constants';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';
import { getRateLimitIdentifier, RateLimiter } from '@/lib/utils/rate-limiter';

const getGameRateLimiter = new RateLimiter(RATE_LIMIT_GAME_GET, RATE_LIMIT_WINDOW_MS / 60000);

export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    // Rate limiting: 90 fetches per minute per IP (clients poll this route every 2s)
    const clientIp = getRateLimitIdentifier(request);
    const rateLimit = getGameRateLimiter.check(`game-get:${clientIp}`);
    if (!rateLimit.allowed) {
      const rateLimitHeaders: Record<string, string> = {};
      if (rateLimit.retryAfter !== undefined) {
        rateLimitHeaders['Retry-After'] = String(rateLimit.retryAfter);
      }
      if (rateLimit.limit !== undefined) {
        rateLimitHeaders['X-RateLimit-Limit'] = String(rateLimit.limit);
      }
      if (rateLimit.remaining !== undefined) {
        rateLimitHeaders['X-RateLimit-Remaining'] = String(rateLimit.remaining);
      }
      if (rateLimit.resetAt !== undefined) {
        rateLimitHeaders['X-RateLimit-Reset'] = String(Math.floor(rateLimit.resetAt / 1000));
      }

      return NextResponse.json(
        { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' } },
        { status: 429, headers: rateLimitHeaders }
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

    const { roomCode } = await params;
    const game = await storage.games.get(roomCode);

    if (!game) {
      logger.info('Game not found', { roomCode, userId });
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    if (!game.playerIds.includes(userId)) {
      logger.warn('Unauthorized game access attempt', {
        roomCode,
        userId,
        gamePlayerIds: game.playerIds,
      });
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to access this game' } },
        { status: 403 }
      );
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch (error) {
    logger.error('Failed to fetch game', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch game' } },
      { status: 500 }
    );
  }
}
