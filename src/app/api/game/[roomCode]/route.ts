import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';

export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
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
