/**
 * Client-side game management utilities
 */

import { GAME_STATE_POLL_INTERVAL_MS, GAME_STATE_POLL_MAX_INTERVAL_MS } from '@/lib/api-constants';
import type { GameState } from './game-types';
import { createLogger } from './utils/logger';

const logger = createLogger('client-game');

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

    // Exponential backoff: the delay doubles on every consecutive failed poll,
    // capped at GAME_STATE_POLL_MAX_INTERVAL_MS, and resets to the base
    // interval on the first successful poll (both from api-constants.ts).
    let currentDelay = GAME_STATE_POLL_INTERVAL_MS;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (!isActive) return;

      // Don't start a new request if one is already in flight
      if (lastRequestPromise) {
        return;
      }

      const request = (async () => {
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

          // Successful poll: return to the normal cadence
          currentDelay = GAME_STATE_POLL_INTERVAL_MS;
        } catch (error) {
          // Ignore abort errors, they're expected on cleanup
          const isAbortError = error instanceof Error && error.name === 'AbortError';

          if (!isAbortError) {
            if (error instanceof Error && isActive) {
              logger.error('Failed to fetch game state', error);
            }

            // Failed poll: back off so a failing backend isn't hammered
            currentDelay = Math.min(currentDelay * 2, GAME_STATE_POLL_MAX_INTERVAL_MS);
          }
        } finally {
          lastRequestPromise = null;
        }
      })();

      lastRequestPromise = request;
      await request;
    };

    // Self-rescheduling chain (replaces setInterval): the next poll is queued
    // only once the current one settles, using the delay its outcome produced.
    const scheduleNextPoll = () => {
      if (!isActive) return;

      timeoutId = setTimeout(() => {
        void runPollCycle();
      }, currentDelay);
    };

    const runPollCycle = async () => {
      await poll();
      scheduleNextPoll();
    };

    // Initial fetch, then keep polling
    void runPollCycle();

    return {
      unsubscribe: () => {
        isActive = false;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        abortController.abort();
      },
    };
  },
};
