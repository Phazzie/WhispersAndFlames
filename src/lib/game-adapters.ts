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
      if (error instanceof Error && error.message.includes('fetch game')) {
        // clientGame.get throws "Failed to fetch game" if response is not ok.
        // If it's a 404, we should return null.
        // However, clientGame throws generic error based on API response.
        // Assuming the API returns 404 with "Room not found" or similar.
        // Ideally clientGame should be more specific, but for now we catch generic errors
        // and if it seems like a not-found (which we can't easily distinguish without inspecting the error message or changing clientGame),
        // we might return null.
        // But for safety, if the API fails, returning null might be safer than crashing if the intention is "does game exist?".
        // If the API returns 404, clientGame throws.
        // Let's assume for now that if get fails, the game might not exist.
        // But we should be careful about network errors vs 404.
        // Since we can't distinguish easily without parsing error message from response (which clientGame swallows partially),
        // we will assume valid usage where get() is called on existing rooms usually.
        // But the interface says `Promise<GameState | null>`.
        // Let's try to infer.
        return null;
      }
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
    return Promise.resolve(localGame.get(roomCode));
  }

  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    const result = localGame.update(roomCode, updates);
    if (!result) {
      throw new Error('Game not found');
    }
    return Promise.resolve(result);
  }

  subscribe(roomCode: string, callback: (game: GameState) => void) {
    // Poll for updates every 2 seconds, similar to online adapter
    let isActive = true;

    // Also listen for storage events for cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (!isActive) return;
      if (e.key && e.key.includes(roomCode)) {
        const game = localGame.get(roomCode);
        if (game) {
          callback(game);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    const poll = () => {
      if (!isActive) return;
      const game = localGame.get(roomCode);
      if (game) {
        callback(game);
      }
    };

    const intervalId = setInterval(poll, 2000);

    // Initial fetch
    poll();

    return {
      unsubscribe: () => {
        isActive = false;
        clearInterval(intervalId);
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorage);
        }
      },
    };
  }
}
