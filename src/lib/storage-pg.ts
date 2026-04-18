/**
 * PostgreSQL storage adapter for game state.
 */

import { Pool } from 'pg';

import type { GameState } from './game-types';
import { createLogger } from './utils/logger';
import { withRetry } from './utils/retry';

const logger = createLogger('storage-pg');

function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object') {
      return parsed as T;
    }
    logger.error('JSON parse resulted in non-object value');
    return fallback;
  } catch (error) {
    logger.error('Failed to parse JSON', error);
    return fallback;
  }
}

interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  lastConnectionTime?: number;
  connectionErrors: number;
  connectionAttempts: number;
}

const poolMetrics: PoolMetrics = {
  totalConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  connectionErrors: 0,
  connectionAttempts: 0,
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});

pool.on('connect', () => {
  poolMetrics.connectionAttempts++;
  poolMetrics.lastConnectionTime = Date.now();
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  poolMetrics.connectionErrors++;
  logger.error('Unexpected database error on idle client', err);
});

if (process.env.NODE_ENV === 'development') {
  pool.on('acquire', () => {
    logger.debug('Connection acquired from pool');
  });

  pool.on('remove', () => {
    logger.debug('Connection removed from pool');
  });
}

export function getPoolMetrics(): PoolMetrics {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    lastConnectionTime: poolMetrics.lastConnectionTime,
    connectionErrors: poolMetrics.connectionErrors,
    connectionAttempts: poolMetrics.connectionAttempts,
  };
}

export async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        room_code VARCHAR(50) PRIMARY KEY,
        state JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
      );

      CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at);
      CREATE INDEX IF NOT EXISTS idx_games_player_ids ON games USING GIN ((state->'playerIds'));

      CREATE OR REPLACE FUNCTION cleanup_expired_data()
      RETURNS void AS $$
      BEGIN
        DELETE FROM games WHERE expires_at < NOW();
      END;
      $$ LANGUAGE plpgsql;
    `);
    logger.info('Database schema initialized successfully');
  } finally {
    client.release();
  }
}

export async function cleanupExpiredData(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT cleanup_expired_data()');
      logger.info('Database cleanup completed successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Database cleanup failed', err);
    throw err;
  }
}

export const storage = {
  games: {
    create: async (roomCode: string, initialState: GameState): Promise<GameState> => {
      return withRetry(async () => {
        const client = await pool.connect();
        try {
          await client.query('INSERT INTO games (room_code, state) VALUES ($1, $2)', [
            roomCode,
            JSON.stringify(initialState),
          ]);
          return initialState;
        } finally {
          client.release();
        }
      });
    },

    get: async (roomCode: string): Promise<GameState | undefined> => {
      return withRetry(async () => {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT state FROM games WHERE room_code = $1 AND expires_at > NOW()',
            [roomCode]
          );
          if (result.rows.length > 0) {
            const rawState = result.rows[0].state;
            if (typeof rawState === 'string') {
              return safeJsonParse<GameState>(rawState, {} as GameState);
            }
            return rawState;
          }
          return undefined;
        } finally {
          client.release();
        }
      });
    },

    update: async (
      roomCode: string,
      updates: Partial<GameState>
    ): Promise<GameState | undefined> => {
      return withRetry(async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const result = await client.query(
            'SELECT state FROM games WHERE room_code = $1 AND expires_at > NOW() FOR UPDATE',
            [roomCode]
          );

          if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return undefined;
          }

          let currentState: GameState;
          const rawState = result.rows[0].state;
          if (typeof rawState === 'string') {
            currentState = safeJsonParse<GameState>(rawState, {} as GameState);
            if (!currentState || typeof currentState !== 'object') {
              await client.query('ROLLBACK');
              throw new Error('Invalid game state in database');
            }
          } else {
            currentState = rawState;
          }

          if (
            updates.players &&
            Array.isArray(updates.players) &&
            Array.isArray(currentState.players)
          ) {
            const existingIds = new Set(currentState.players.map((p) => p.id));
            const incomingNewPlayers = updates.players.filter((p) => !existingIds.has(p.id));
            if (incomingNewPlayers.length === 0) {
              await client.query('ROLLBACK');
              return currentState;
            }
          }

          const updatedState = { ...currentState, ...updates };

          await client.query(
            'UPDATE games SET state = $1, updated_at = NOW() WHERE room_code = $2',
            [JSON.stringify(updatedState), roomCode]
          );

          await client.query('COMMIT');

          return updatedState;
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error('Transaction error in games.update', err);
          throw err;
        } finally {
          client.release();
        }
      });
    },

    delete: async (roomCode: string): Promise<void> => {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM games WHERE room_code = $1', [roomCode]);
      } finally {
        client.release();
      }
    },

    subscribe: (_roomCode: string, _callback: (state: GameState) => void): (() => void) => {
      return () => {};
    },

    list: async (userId: string, filter?: { step?: string }): Promise<GameState[]> => {
      const client = await pool.connect();
      try {
        let query = `
          SELECT state FROM games
          WHERE state->'playerIds' @> $1::jsonb
            AND expires_at > NOW()
          LIMIT 50
        `;
        const params: string[] = [JSON.stringify([userId])];

        if (filter?.step) {
          query = `
            SELECT state FROM games
            WHERE state->'playerIds' @> $1::jsonb
              AND state->>'step' = $2
              AND expires_at > NOW()
            LIMIT 50
          `;
          params.push(filter.step);
        }

        const result = await client.query(query, params);
        return result.rows.map((row) => row.state as GameState);
      } finally {
        client.release();
      }
    },
  },
};

export { pool };
