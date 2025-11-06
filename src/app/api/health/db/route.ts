/**
 * Database health check endpoint
 * Provides detailed database connectivity and performance metrics
 *
 * GET /api/health/db
 * Returns:
 * - 200: Database is healthy
 * - 503: Database is degraded or unhealthy
 */

import { NextResponse } from 'next/server';

import { pool, getPoolMetrics } from '@/lib/storage-pg';
import { checkDatabaseHealth, getPoolStats } from '@/lib/utils/db-health';

export async function GET() {
  try {
    // Perform comprehensive health check
    const health = await checkDatabaseHealth(pool, 5000);

    // Get pool metrics from storage-pg
    const poolMetrics = getPoolMetrics();

    // Get current pool stats
    const poolStats = getPoolStats(pool);

    // Build response
    const response = {
      database: health,
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
