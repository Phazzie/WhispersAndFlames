// #TODO: Implement Game Adapters.
// Define interfaces and implementations for Online (Clerk+API) and Local (localStorage) game modes.
// See #TODO.md "Unified Game Context" section.

import { clientGame } from './client-game';
import type { GameState } from './game-types';

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
      console.error('Failed to get game:', error);
      return null;
    }
  }
  async update(roomCode: string, updates: Partial<GameState>): Promise<GameState> {
    return clientGame.update(roomCode, updates);
  }
  subscribe(roomCode: string, callback: (game: GameState) => void) {
    return clientGame.subscribe(roomCode, callback);
  }
}

export class LocalGameAdapter implements GameAdapter {
  // #TODO: Implement using localGame
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
