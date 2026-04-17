/**
 * Vercel Cron Job endpoint for database cleanup
 * Runs daily at midnight UTC (`0 0 * * *`) to clean up expired games.
 *
 * GET /api/cron/cleanup
 * Authorization: Bearer <CRON_SECRET>
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('cron-cleanup');

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;

    if (!env.CRON_SECRET) {
      logger.error('CRON_SECRET not set - refusing to process unprotected cron endpoint');
      return NextResponse.json({ error: 'Forbidden: CRON_SECRET not set' }, { status: 403 });
    } else if (authHeader !== expectedAuth) {
      logger.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only run cleanup if DATABASE_URL is configured
    if (!env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        message: 'Skipped - using in-memory storage (no cleanup needed)',
        timestamp: new Date().toISOString(),
      });
    }

    // Dynamic import to avoid loading pg when not needed
    const { cleanupExpiredData } = await import('@/lib/storage-pg');

    // Run cleanup
    await cleanupExpiredData();

    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron cleanup failed', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
