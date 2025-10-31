/**
 * PostgreSQL storage adapter for game state and user sessions
 * Replaces in-memory storage for production deployment
 */

import { Pool, PoolClient } from 'pg';

import type { GameState, Player } from './game-types';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// User storage
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface Session {
  userId: string;
  expiresAt: Date;
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

      CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at);

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

// Cleanup expired data every 5 minutes
setInterval(
  async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT cleanup_expired_data()');
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  },
  5 * 60 * 1000
);

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
    },

    get: async (roomCode: string): Promise<GameState | undefined> => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT state FROM games WHERE room_code = $1 AND expires_at > NOW()',
          [roomCode]
        );
        return result.rows.length > 0 ? result.rows[0].state : undefined;
      } finally {
        client.release();
      }
    },

    update: async (
      roomCode: string,
      updates: Partial<GameState>
    ): Promise<GameState | undefined> => {
      const client = await pool.connect();
      try {
        // Get current state
        const result = await client.query(
          'SELECT state FROM games WHERE room_code = $1 AND expires_at > NOW()',
          [roomCode]
        );
        if (result.rows.length === 0) return undefined;

        // Merge updates with current state
        const currentState = result.rows[0].state as GameState;
        const updatedState = { ...currentState, ...updates };

        // Save updated state
        await client.query('UPDATE games SET state = $1, updated_at = NOW() WHERE room_code = $2', [
          JSON.stringify(updatedState),
          roomCode,
        ]);

        return updatedState;
      } finally {
        client.release();
      }
    },

    delete: async (roomCode: string): Promise<void> => {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM games WHERE room_code = $1', [roomCode]);
      } finally {
        client.release();
      }
    },

    subscribe: (roomCode: string, callback: (state: GameState) => void): (() => void) => {
      // PostgreSQL doesn't support real-time subscriptions natively
      // We'll use polling on the client side instead
      // This is a no-op for compatibility with the in-memory implementation
      return () => {};
    },

    list: async (userId: string, filter?: { step?: string }): Promise<GameState[]> => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT state FROM games WHERE expires_at > NOW()', []);

        // Filter games where user is a player
        let userGames = result.rows
          .map((row) => row.state as GameState)
          .filter((game) => game.playerIds.includes(userId));

        // Apply additional filters
        if (filter?.step) {
          userGames = userGames.filter((game) => game.step === filter.step);
        }

        return userGames;
      } finally {
        client.release();
      }
    },
  },
};

// Export pool for advanced usage
export { pool };
