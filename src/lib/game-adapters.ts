// #TODO: Implement Game Adapters.
// Define interfaces and implementations for Online (Clerk+API) and Local (localStorage) game modes.
// See #TODO.md "Unified Game Context" section.

import { clientGame } from './client-game';
import type { GameState } from './game-types';
import { localGame } from './local-game';

export interface GameAdapter {
  get(roomCode: string): Promise<GameState | null>;
  update(roomCode: string, updates: Partial<GameState>): Promise<GameState>;
  subscribe(roomCode: string, callback: (game: GameState) => void): { unsubscribe: () => void };
}

export class OnlineGameAdapter implements GameAdapter {
  async get(roomCode: string): Promise<GameState | null> {
    try {
      return await clientGame.get(roomCode);
    } catch (error) {
      console.error('OnlineGameAdapter.get error:', error);
      throw error;
    }
  }

  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    return await clientGame.update(roomCode, updates);
  }

  subscribe(roomCode: string, callback: (game: GameState) => void) {
    return clientGame.subscribe(roomCode, callback);
  }
}

export class LocalGameAdapter implements GameAdapter {
  async get(roomCode: string): Promise<GameState | null> {
    // Simulate async for consistency
    return Promise.resolve(localGame.get(roomCode));
  }

  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    const updated = localGame.update(roomCode, updates);
    if (!updated) {
      throw new Error('Failed to update local game: Game not found');
    }
    // Dispatch a storage event manually so other listeners (if any) or the subscription picks it up?
    // Actually, we can just return it. The subcription mechanism below handles external changes.
    // For internal changes (updates made by this adapter), we rely on the caller updating their state
    // from the return value, OR we can trigger the callback.
    // To match clientGame (which polls), we might need to ensure the callback is fired.
    // But usually clientGame.update returns the new state and the polling eventually catches up.
    return Promise.resolve(updated);
  }

  subscribe(roomCode: string, callback: (game: GameState) => void) {
    // Listen for storage events (changes from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `local-game:${roomCode}` && e.newValue) {
        try {
          const gameState = JSON.parse(e.newValue);
          callback(gameState);
        } catch (err) {
          console.error('Error parsing local game state from storage event:', err);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);

      // Also set up a poller to handle same-tab updates if they don't go through this specific instance
      // (though they should if we use the singleton adapter).
      // However, localGame.update writes to localStorage but doesn't emit an event for the same window.
      // So we might need to poll or hook into localGame.
      // For now, simple polling is robust.
      const intervalId = setInterval(() => {
        const game = localGame.get(roomCode);
        if (game) {
          callback(game);
        }
      }, 1000);

      return {
        unsubscribe: () => {
          window.removeEventListener('storage', handleStorageChange);
          clearInterval(intervalId);
        },
      };
    }

    return { unsubscribe: () => {} };
  }
}
