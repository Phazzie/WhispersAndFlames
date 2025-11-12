/**
 * Database health check endpoint
 * Provides detailed database connectivity and performance metrics
 *
 * GET /api/health/db
 * Returns:
 * - 200: Database is healthy or not configured (using in-memory storage)
 * - 503: Database is degraded or unhealthy
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if database is explicitly disabled
    if (process.env.DISABLE_DATABASE === 'true') {
      return NextResponse.json(
        {
          database: {
            status: 'disabled',
            message: 'Database explicitly disabled via DISABLE_DATABASE - using in-memory storage',
            timestamp: new Date().toISOString(),
          },
          storageMode: 'memory',
          checks: {
            connectivity: false,
            performance: false,
            poolHealth: false,
          },
        },
        { status: 200 }
      );
    }

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          database: {
            status: 'not_configured',
            message: 'DATABASE_URL not set - using in-memory storage',
            timestamp: new Date().toISOString(),
          },
          storageMode: 'memory',
          checks: {
            connectivity: false,
            performance: false,
            poolHealth: false,
          },
        },
        { status: 200 }
      );
    }

    // Dynamic import only when DATABASE_URL exists
    const { pool, getPoolMetrics } = await import('@/lib/storage-pg');
    const { checkDatabaseHealth, getPoolStats } = await import('@/lib/utils/db-health');

    // Perform comprehensive health check
    const health = await checkDatabaseHealth(pool, 5000);

    // Get pool metrics from storage-pg
    const poolMetrics = getPoolMetrics();

    // Get current pool stats
    const poolStats = getPoolStats(pool);

    // Build response
    const response = {
      database: health,
      storageMode: 'postgres',
      pool: {
        current: poolStats,
        metrics: {
          totalAttempts: poolMetrics.connectionAttempts,
          errors: poolMetrics.connectionErrors,
          lastConnection: poolMetrics.lastConnectionTime
            ? new Date(poolMetrics.lastConnectionTime).toISOString()
            : null,
        },
      },
      checks: {
        connectivity: health.connectivity.connected,
        performance: health.performance.querySuccess,
        poolHealth: poolStats.waiting < 5,
      },
    };

    // Determine HTTP status code
    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    // Handle unexpected errors
    return NextResponse.json(
      {
        database: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        storageMode: process.env.DATABASE_URL ? 'postgres' : 'memory',
        checks: {
          connectivity: false,
          performance: false,
          poolHealth: false,
        },
      },
      { status: 503 }
    );
  }
}
