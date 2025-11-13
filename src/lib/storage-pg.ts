/**
 * PostgreSQL storage adapter for game state and user sessions
 * Replaces in-memory storage for production deployment
 */

import { Pool } from 'pg';

import type { GameState } from './game-types';

// Exponential backoff retry utility
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 100
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        // Don't retry on validation or constraint errors
        if (
          errorMessage.includes('duplicate') ||
          errorMessage.includes('constraint') ||
          errorMessage.includes('invalid')
        ) {
          throw error;
        }
      }

      // Last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: wait 100ms, 200ms, 400ms, etc.
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// Safe JSON parsing with validation
function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation that we got an object
    if (parsed && typeof parsed === 'object') {
      return parsed as T;
    }
    console.error('JSON parse resulted in non-object value');
    return fallback;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
}

// Connection pool metrics
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

// Create connection pool
// Note: Using max: 1 for serverless environments to prevent connection exhaustion
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 1, // Reduced for serverless - prevents connection pool exhaustion
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 10000, // 10 second query timeout to prevent long-running queries
});

// Connection pool monitoring
pool.on('connect', (_client) => {
  poolMetrics.connectionAttempts++;
  poolMetrics.lastConnectionTime = Date.now();
  console.log('✅ New database connection established');
});

pool.on('error', (err, _client) => {
  poolMetrics.connectionErrors++;
  console.error('❌ Unexpected database error on idle client:', err);
});

pool.on('acquire', (_client) => {
  console.log('🔒 Connection acquired from pool');
});

pool.on('remove', (_client) => {
  console.log('🗑️  Connection removed from pool');
});

// Function to get current pool metrics
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

// User storage
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// Initialize database schema
export async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS games (
        room_code VARCHAR(50) PRIMARY KEY,
        state JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at);
      CREATE INDEX IF NOT EXISTS idx_games_player_ids ON games USING GIN ((state->'playerIds'));

      -- Cleanup expired sessions and games periodically
      CREATE OR REPLACE FUNCTION cleanup_expired_data()
      RETURNS void AS $$
      BEGIN
        DELETE FROM sessions WHERE expires_at < NOW();
        DELETE FROM games WHERE expires_at < NOW();
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Database schema initialized successfully');
  } finally {
    client.release();
  }
}

// Export cleanup function for Vercel Cron Job (serverless-compatible)
// Instead of setInterval (which doesn't work in serverless), we use Vercel Cron
export async function cleanupExpiredData(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT cleanup_expired_data()');
      console.log('✅ Database cleanup completed successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Database cleanup failed:', err);
    throw err;
  }
}

// Note: Graceful shutdown is not needed in serverless environments
// Vercel automatically handles connection cleanup after function execution

export const storage = {
  // User methods
  users: {
    create: async (email: string, passwordHash: string): Promise<User> => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, created_at',
          [email, passwordHash]
        );
        return {
          id: result.rows[0].id,
          email: result.rows[0].email,
          passwordHash: result.rows[0].password_hash,
          createdAt: result.rows[0].created_at,
        };
      } finally {
        client.release();
      }
    },

    findByEmail: async (email: string): Promise<User | undefined> => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
          [email]
        );
        if (result.rows.length === 0) return undefined;
        return {
          id: result.rows[0].id,
          email: result.rows[0].email,
          passwordHash: result.rows[0].password_hash,
          createdAt: result.rows[0].created_at,
        };
      } finally {
        client.release();
      }
    },

    findById: async (id: string): Promise<User | undefined> => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, password_hash, created_at FROM users WHERE id = $1',
          [id]
        );
        if (result.rows.length === 0) return undefined;
        return {
          id: result.rows[0].id,
          email: result.rows[0].email,
          passwordHash: result.rows[0].password_hash,
          createdAt: result.rows[0].created_at,
        };
      } finally {
        client.release();
      }
    },
  },

  // Session methods
  sessions: {
    create: async (userId: string): Promise<string> => {
      const client = await pool.connect();
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const result = await client.query(
          'INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING token',
          [userId, expiresAt]
        );
        return result.rows[0].token;
      } finally {
        client.release();
      }
    },

    validate: async (token: string): Promise<string | null> => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
          [token]
        );
        return result.rows.length > 0 ? result.rows[0].user_id : null;
      } finally {
        client.release();
      }
    },

    delete: async (token: string): Promise<void> => {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM sessions WHERE token = $1', [token]);
      } finally {
        client.release();
      }
    },
  },

  // Game methods
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
            // Safe JSON parsing with fallback
            const rawState = result.rows[0].state;
            if (typeof rawState === 'string') {
              return safeJsonParse<GameState>(rawState, undefined as any);
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
          // Use transaction with row-level locking to prevent race conditions
          await client.query('BEGIN');

          // Get current state with row lock (FOR UPDATE prevents concurrent modifications)
          const result = await client.query(
            'SELECT state FROM games WHERE room_code = $1 AND expires_at > NOW() FOR UPDATE',
            [roomCode]
          );

          if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return undefined;
          }

          // Safe JSON parsing with validation
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

          // Merge updates with current state
          const updatedState = { ...currentState, ...updates };

          // Save updated state
          await client.query(
            'UPDATE games SET state = $1, updated_at = NOW() WHERE room_code = $2',
            [JSON.stringify(updatedState), roomCode]
          );

          // Commit transaction
          await client.query('COMMIT');

          return updatedState;
        } catch (err) {
          // Rollback on any error
          await client.query('ROLLBACK');
          console.error('Transaction error in games.update:', err);
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
      // PostgreSQL doesn't support real-time subscriptions natively
      // We'll use polling on the client side instead
      // This is a no-op for compatibility with the in-memory implementation
      return () => {};
    },

    list: async (userId: string, filter?: { step?: string }): Promise<GameState[]> => {
      const client = await pool.connect();
      try {
        // Use GIN index for efficient player_id filtering
        // The @> operator checks if the left JSONB contains the right JSONB
        let query = `
          SELECT state FROM games
          WHERE state->'playerIds' @> $1::jsonb
            AND expires_at > NOW()
          LIMIT 50
        `;
        const params: any[] = [JSON.stringify([userId])];

        // Apply step filter at database level if provided
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

// Export pool for advanced usage
export { pool };
