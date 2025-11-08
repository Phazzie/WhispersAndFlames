/**
 * Vercel Cron Job endpoint for database cleanup
 * Runs every 5 minutes to clean up expired sessions and games
 *
 * GET /api/cron/cleanup
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "*\/5 * * * *"
 *   }]
 * }
 *
 * Security: Vercel Cron Jobs are automatically authenticated and can only be
 * triggered by Vercel itself. The x-vercel-cron header is added by Vercel.
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Verify request is from Vercel Cron (Vercel adds this header automatically)
    // This header cannot be spoofed from external requests
    const cronHeader = request.headers.get('x-vercel-cron');

    if (!cronHeader && process.env.NODE_ENV === 'production') {
      console.error('❌ Unauthorized cron request - missing x-vercel-cron header');
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
