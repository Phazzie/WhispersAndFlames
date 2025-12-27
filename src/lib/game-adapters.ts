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
      return null;
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
    // Local game operations are synchronous, but we simulate async for the interface
    return Promise.resolve(localGame.get(roomCode));
  }

  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    const updated = localGame.update(roomCode, updates);
    if (!updated) {
      throw new Error('Failed to update local game');
    }
    return Promise.resolve(updated);
  }

  subscribe(roomCode: string, callback: (game: GameState) => void) {
    // For local games, we can just poll local storage or use a custom event.
    // Since localGame updates happen in the same window, we can listen for storage events
    // or just rely on the fact that the state is usually updated by the same client.
    // However, to support multiple tabs, a storage listener is good.
    // For now, simple polling like online game is safest to catch cross-tab updates.

    let isActive = true;
    let lastStateStr = JSON.stringify(localGame.get(roomCode) || {});

    const intervalId = setInterval(() => {
      if (!isActive) return;
      const game = localGame.get(roomCode);
      if (game) {
        // Optimization: prevent re-renders if state hasn't changed
        const currentStateStr = JSON.stringify(game);
        if (currentStateStr !== lastStateStr) {
          lastStateStr = currentStateStr;
          callback(game);
        }
      }
    }, 1000); // Poll every 1s for local

    return {
      unsubscribe: () => {
        isActive = false;
        clearInterval(intervalId);
      },
    };
  }
}
