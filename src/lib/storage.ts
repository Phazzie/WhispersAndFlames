/**
 * In-memory storage for game state and user sessions
 * For production with DigitalOcean, this would be replaced with a database
 */

import type { GameState, Player } from './game-types';

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

// In-memory stores
const users = new Map<string, User>();
const sessions = new Map<string, Session>();
const games = new Map<string, GameState>();
const gameSubscribers = new Map<string, Set<(state: GameState) => void>>();

// Cleanup expired sessions periodically
setInterval(() => {
  const now = new Date();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60000); // Every minute

export const storage = {
  // User methods
  users: {
    create: async (email: string, passwordHash: string): Promise<User> => {
      const id = crypto.randomUUID();
      const user: User = {
        id,
        email,
        passwordHash,
        createdAt: new Date(),
      };
      users.set(id, user);
      return user;
    },

    findByEmail: async (email: string): Promise<User | undefined> => {
      return Array.from(users.values()).find((u) => u.email === email);
    },

    findById: async (id: string): Promise<User | undefined> => {
      return users.get(id);
    },
  },

  // Session methods
  sessions: {
    create: async (userId: string): Promise<string> => {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      sessions.set(token, {
        userId,
        expiresAt,
      });

      return token;
    },

    validate: async (token: string): Promise<string | null> => {
      const session = sessions.get(token);
      if (!session) return null;

      if (session.expiresAt < new Date()) {
        sessions.delete(token);
        return null;
      }

      return session.userId;
    },

    delete: async (token: string): Promise<void> => {
      sessions.delete(token);
    },
  },

  // Game methods
  games: {
    create: async (roomCode: string, initialState: GameState): Promise<GameState> => {
      games.set(roomCode, initialState);
      return initialState;
    },

    get: async (roomCode: string): Promise<GameState | undefined> => {
      return games.get(roomCode);
    },

    update: async (
      roomCode: string,
      updates: Partial<GameState>
    ): Promise<GameState | undefined> => {
      const game = games.get(roomCode);
      if (!game) return undefined;

      const updated = { ...game, ...updates };
      games.set(roomCode, updated);

      // Notify subscribers
      const subscribers = gameSubscribers.get(roomCode);
      if (subscribers) {
        subscribers.forEach((callback) => callback(updated));
      }

      return updated;
    },

    delete: async (roomCode: string): Promise<void> => {
      games.delete(roomCode);
      gameSubscribers.delete(roomCode);
    },

    subscribe: (roomCode: string, callback: (state: GameState) => void): (() => void) => {
      if (!gameSubscribers.has(roomCode)) {
        gameSubscribers.set(roomCode, new Set());
      }

      const subscribers = gameSubscribers.get(roomCode)!;
      subscribers.add(callback);

      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          gameSubscribers.delete(roomCode);
        }
      };
    },

    list: async (userId: string, filter?: { step?: string }): Promise<GameState[]> => {
      const userGames = Array.from(games.values()).filter((game) =>
        game.playerIds.includes(userId)
      );

      if (filter?.step) {
        return userGames.filter((game) => game.step === filter.step);
      }

      return userGames;
    },
  },
};
