// #TODO: Implement Game Adapters.
// Define interfaces and implementations for Online (Clerk+API) and Local (localStorage) game modes.
// See #TODO.md "Unified Game Context" section.

import type { GameState } from './game-types';
import { localGame } from './local-game';

export interface GameAdapter {
  get(roomCode: string): Promise<GameState | null>;
  update(roomCode: string, updates: Partial<GameState>): Promise<GameState>;
  subscribe(roomCode: string, callback: (game: GameState) => void): { unsubscribe: () => void };
}

export class OnlineGameAdapter implements GameAdapter {
  // #TODO: Implement using clientGame
  async get(roomCode: string): Promise<GameState | null> {
    throw new Error('Not implemented');
  }
  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    throw new Error('Not implemented');
  }
  subscribe(roomCode: string, callback: (game: GameState) => void) {
    throw new Error('Not implemented');
  }
}

type Subscriber = (game: GameState) => void;
const STORAGE_KEY_PREFIX = 'local-game:';

export class LocalGameAdapter implements GameAdapter {
  private subscribers: Map<string, Set<Subscriber>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(STORAGE_KEY_PREFIX)) {
      const roomCode = event.key.replace(STORAGE_KEY_PREFIX, '');
      if (event.newValue) {
        try {
          const game = JSON.parse(event.newValue);
          this.notify(roomCode, game);
        } catch (e) {
          console.error('Failed to parse game state from storage event', e);
        }
      }
    }
  };

  private notify(roomCode: string, game: GameState) {
    const roomSubscribers = this.subscribers.get(roomCode);
    if (roomSubscribers) {
      roomSubscribers.forEach((callback) => callback(game));
    }
  }

  async get(roomCode: string): Promise<GameState | null> {
    return localGame.get(roomCode);
  }

  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    const updatedGame = localGame.update(roomCode, updates);
    if (!updatedGame) {
      throw new Error('Game not found');
    }
    this.notify(roomCode, updatedGame);
    return updatedGame;
  }

  subscribe(roomCode: string, callback: (game: GameState) => void) {
    if (!this.subscribers.has(roomCode)) {
      this.subscribers.set(roomCode, new Set());
    }
    this.subscribers.get(roomCode)!.add(callback);

    return {
      unsubscribe: () => {
        const roomSubscribers = this.subscribers.get(roomCode);
        if (roomSubscribers) {
          roomSubscribers.delete(callback);
          if (roomSubscribers.size === 0) {
            this.subscribers.delete(roomCode);
          }
        }
      },
    };
  }
}
