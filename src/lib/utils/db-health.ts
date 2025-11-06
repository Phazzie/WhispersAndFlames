/**
 * Database health check utilities
 * Provides comprehensive health monitoring for PostgreSQL connection pool
 */

import { Pool } from 'pg';

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  connectivity: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
  pool: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  performance: {
    queryLatencyMs?: number;
    querySuccess: boolean;
  };
}

/**
 * Performs a comprehensive database health check
 * @param pool - PostgreSQL connection pool
 * @param timeout - Maximum time to wait for health check (default: 5000ms)
 * @returns Health status object
 */
export async function checkDatabaseHealth(
  pool: Pool,
  timeout: number = 5000
): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  const health: DatabaseHealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectivity: {
      connected: false,
    },
    pool: {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    },
    performance: {
      querySuccess: false,
    },
  };

  try {
    // Test database connectivity with timeout
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      ),
    ]);

    try {
      const connectTime = Date.now() - startTime;
      health.connectivity.connected = true;
      health.connectivity.latencyMs = connectTime;

      // Test query performance
      const queryStart = Date.now();
      await client.query('SELECT 1 as health_check');
      const queryTime = Date.now() - queryStart;

      health.performance.queryLatencyMs = queryTime;
      health.performance.querySuccess = true;

      // Determine overall health status
      if (connectTime > 2000 || queryTime > 1000) {
        health.status = 'degraded';
      } else if (health.pool.waitingClients > 5) {
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
      }
    } finally {
      client.release();
    }
  } catch (err) {
    health.status = 'unhealthy';
    health.connectivity.connected = false;
    health.connectivity.error = err instanceof Error ? err.message : 'Unknown error';
    health.performance.querySuccess = false;
  }

  return health;
}

/**
 * Checks if the database connection pool is healthy
 * @param pool - PostgreSQL connection pool
 * @returns True if healthy, false otherwise
 */
export async function isDatabaseHealthy(pool: Pool): Promise<boolean> {
  try {
    const health = await checkDatabaseHealth(pool, 3000);
    return health.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Gets detailed pool statistics
 * @param pool - PostgreSQL connection pool
 * @returns Pool statistics object
 */
export function getPoolStats(pool: Pool) {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    utilization:
      pool.totalCount > 0 ? ((pool.totalCount - pool.idleCount) / pool.totalCount) * 100 : 0,
  };
}

/**
 * Tests database query performance
 * @param pool - PostgreSQL connection pool
 * @param testQuery - Optional custom test query
 * @returns Query execution time in milliseconds
 */
export async function testQueryPerformance(
  pool: Pool,
  testQuery: string = 'SELECT COUNT(*) FROM games WHERE expires_at > NOW()'
): Promise<number> {
  const client = await pool.connect();
  try {
    const start = Date.now();
    await client.query(testQuery);
    return Date.now() - start;
  } finally {
    client.release();
  }
}
