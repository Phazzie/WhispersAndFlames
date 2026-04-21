/**
 * In-memory storage for game state.
 */

import type { GameState } from './game-types';

const games = new Map<string, GameState>();
const gameSubscribers = new Map<string, Set<(state: GameState) => void>>();

export const storage = {
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

      if (updates.players && Array.isArray(updates.players) && Array.isArray(game.players)) {
        const mergedPlayers = [...game.players];

        for (const incomingPlayer of updates.players) {
          const existingIndex = mergedPlayers.findIndex(
            (player) => player.id === incomingPlayer.id
          );
          if (existingIndex >= 0) {
            mergedPlayers[existingIndex] = incomingPlayer;
          } else {
            mergedPlayers.push(incomingPlayer);
          }
        }

        updated.players = mergedPlayers;
      }

      if (updates.playerIds && Array.isArray(updates.playerIds) && Array.isArray(game.playerIds)) {
        updated.playerIds = Array.from(new Set([...game.playerIds, ...updates.playerIds]));
      }

      games.set(roomCode, updated);

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
