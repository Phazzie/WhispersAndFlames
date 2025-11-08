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
 * Security: Vercel automatically authenticates cron jobs via the CRON_SECRET
 * environment variable. When deployed on Vercel, only requests from Vercel's
 * cron system will have access to this endpoint.
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Verify this is a legitimate Vercel Cron request
    // Vercel automatically sets CRON_SECRET and validates it
    const authHeader = request.headers.get('authorization');
    
    // On Vercel, cron jobs are authenticated via CRON_SECRET
    // In development/testing, we allow requests without auth
    if (process.env.VERCEL === '1') {
      const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
      
      if (!process.env.CRON_SECRET) {
        console.error('❌ CRON_SECRET not set in production - endpoint is unprotected!');
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
      }
      
      if (authHeader !== expectedAuth) {
        console.error('❌ Unauthorized cron request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // In development, log a warning but allow the request
      console.log('⚠️  Running cron cleanup in development mode (no auth check)');
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
