'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { GameState } from '@/lib/game-types';

// #TODO: Implement Unified Game Context
// This provider should abstract the difference between online (Clerk+API) and local (localStorage) games.
// 1. Define a common interface for GameActions (update, submitAnswer, etc.)
// 2. Create implementations for OnlineGameManager and LocalGameManager
// 3. Use this provider to wrap the game pages so components don't need to know the source

interface GameContextType {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  // actions: GameActions;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  // #TODO: Add logic to detect mode (URL param or room code format)
  // #TODO: Initialize appropriate manager

  return (
    <GameContext.Provider value={{ gameState: null, isLoading: true, error: null }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
