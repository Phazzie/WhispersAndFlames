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
    // AbortController to cancel in-flight requests when unsubscribing
    const abortController = new AbortController();
    let isActive = true;

    // Track request state to prevent overlapping requests
    let lastRequestPromise: Promise<void> | null = null;

    const poll = async () => {
      if (!isActive) return;

      // Don't start a new request if one is already in flight
      if (lastRequestPromise) {
        return;
      }

      lastRequestPromise = (async () => {
        try {
          const response = await fetch(`/api/game/${roomCode}`, {
            method: 'GET',
            credentials: 'include',
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new Error('Failed to fetch game');
          }

          const data = await response.json();
          if (isActive) {
            callback(data.game);
          }
        } catch (error) {
          // Ignore abort errors, they're expected on cleanup
          if (error instanceof Error && error.name !== 'AbortError' && isActive) {
            console.error('Failed to fetch game state:', error);
          }
        } finally {
          lastRequestPromise = null;
        }
      })();
    };

    // Poll for updates every 2 seconds
    const intervalId = setInterval(poll, 2000);

    // Initial fetch
    poll();

    return {
      unsubscribe: () => {
        isActive = false;
        clearInterval(intervalId);
        abortController.abort();
      },
    };
  },
};
