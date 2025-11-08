/**
 * In-memory storage for game state and user sessions
 * For production with DigitalOcean, this would be replaced with a database
 */

import type { GameState } from './game-types';
import {
  opportunisticCleanup,
  isDateExpired,
  shouldCleanup,
} from './utils/cleanup';

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

export const storage = {
  // User methods
  users: {
    create: (email: string, passwordHash: string): User => {
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

    findByEmail: (email: string): User | undefined => {
      return Array.from(users.values()).find((u) => u.email === email);
    },

    findById: (id: string): User | undefined => {
      return users.get(id);
    },
  },

  // Session methods
  sessions: {
    create: (userId: string): string => {
      // Opportunistic cleanup when creating sessions (serverless-compatible)
      if (shouldCleanup()) {
        opportunisticCleanup(sessions, (s) => isDateExpired(s.expiresAt));
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      sessions.set(token, {
        userId,
        expiresAt,
      });

      return token;
    },

    validate: (token: string): string | null => {
      const session = sessions.get(token);
      if (!session) return null;

      if (session.expiresAt < new Date()) {
        sessions.delete(token);
        return null;
      }

      return session.userId;
    },

    delete: (token: string): void => {
      sessions.delete(token);
    },
  },

  // Game methods
  games: {
    create: (roomCode: string, initialState: GameState): GameState => {
      games.set(roomCode, initialState);
      return initialState;
    },

    get: (roomCode: string): GameState | undefined => {
      return games.get(roomCode);
    },

    update: (roomCode: string, updates: Partial<GameState>): GameState | undefined => {
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

    delete: (roomCode: string): void => {
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

    list: (userId: string, filter?: { step?: string }): GameState[] => {
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
