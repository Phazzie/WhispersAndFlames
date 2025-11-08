import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';

export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
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

    const { roomCode } = await params;
    const game = await storage.games.get(roomCode);

    if (!game) {
      logger.info('Game not found', { roomCode, userId: user.id });
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // CRITICAL FIX: Verify user is authorized to view this game
    if (!game.playerIds.includes(user.id)) {
      logger.warn('Unauthorized game access attempt', {
        roomCode,
        userId: user.id,
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
