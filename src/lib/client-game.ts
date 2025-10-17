/**
 * Client-side game management utilities
 */

import type { GameState } from './game-types';

export const clientGame = {
  create: async (roomCode: string, playerName: string): Promise<GameState> => {
    const response = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, playerName }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create game');
    }

    const data = await response.json();
    return data.game;
  },

  join: async (roomCode: string, playerName: string): Promise<GameState> => {
    const response = await fetch('/api/game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, playerName }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join game');
    }

    const data = await response.json();
    return data.game;
  },

  get: async (roomCode: string): Promise<GameState> => {
    const response = await fetch(`/api/game/${roomCode}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch game');
    }

    const data = await response.json();
    return data.game;
  },

  update: async (roomCode: string, updates: Partial<GameState>): Promise<GameState> => {
    const response = await fetch('/api/game/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, updates }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update game');
    }

    const data = await response.json();
    return data.game;
  },

  subscribe: (
    roomCode: string,
    callback: (state: GameState) => void
  ): { unsubscribe: () => void } => {
    // Poll for updates every 2 seconds
    const intervalId = setInterval(async () => {
      try {
        const game = await clientGame.get(roomCode);
        callback(game);
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    }, 2000);

    return {
      unsubscribe: () => clearInterval(intervalId),
    };
  },
};
