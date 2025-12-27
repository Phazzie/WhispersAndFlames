// #TODO: Implement Game Adapters.
// Define interfaces and implementations for Online (Clerk+API) and Local (localStorage) game modes.
// See #TODO.md "Unified Game Context" section.

import type { GameState } from './game-types';
import { clientGame } from './client-game';
import { localGame } from './local-game';

export interface GameAdapter {
  get(roomCode: string): Promise<GameState | null>;
  update(roomCode: string, updates: Partial<GameState>): Promise<GameState>;
  subscribe(roomCode: string, callback: (game: GameState) => void): { unsubscribe: () => void };
}

export class OnlineGameAdapter implements GameAdapter {
  async get(roomCode: string): Promise<GameState | null> {
    return await clientGame.get(roomCode);
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
    return Promise.resolve(localGame.get(roomCode));
  }

  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    const updatedGame = localGame.update(roomCode, updates);
    if (!updatedGame) {
      throw new Error(`Local game with room code ${roomCode} not found`);
    }
    return Promise.resolve(updatedGame);
  }

  subscribe(roomCode: string, callback: (game: GameState) => void) {
    let lastStateString = '';

    // Poll localStorage for changes to support multi-tab or ensure freshness
    const poll = () => {
      const game = localGame.get(roomCode);
      if (game) {
        const currentStateString = JSON.stringify(game);
        if (currentStateString !== lastStateString) {
          lastStateString = currentStateString;
          callback(game);
        }
      }
    };

    const intervalId = setInterval(poll, 1000);

    // Also listen for storage events (cross-tab sync)
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key.includes(roomCode)) {
        poll();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // Initial call
    poll();

    return {
      unsubscribe: () => {
        clearInterval(intervalId);
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorage);
        }
      },
    };
  }
}
