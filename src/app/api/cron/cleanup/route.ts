/**
 * Vercel Cron Job endpoint for database cleanup
 * Runs every 5 minutes to clean up expired sessions and games
 *
 * GET /api/cron/cleanup
 * Authorization: Bearer <CRON_SECRET>
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "*\/5 * * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.warn(
        '⚠️  CRON_SECRET not set - cron endpoint is unprotected!'
      );
    } else if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only run cleanup if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
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
    console.error('❌ Cron cleanup failed:', error);

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
