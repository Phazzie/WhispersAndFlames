import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const games = await storage.games.list(userId);
    return NextResponse.json({ games }, { status: 200 });
  } catch (error) {
    logger.error('Failed to list games', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list games' } },
      { status: 500 }
    );
  }
}
