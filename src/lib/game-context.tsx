// #TODO: Implement GameProvider context.
// This context should expose a unified API for game interactions, abstracting away the underlying storage/networking.
// See #TODO.md "Unified Game Context" section.

import { createContext, useContext } from 'react';
import type { GameState } from './game-types';

export interface GameContextType {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  // actions...
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
