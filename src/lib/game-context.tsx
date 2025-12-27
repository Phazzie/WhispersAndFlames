// #TODO: Implement GameProvider context.
// This context should expose a unified API for game interactions, abstracting away the underlying storage/networking.
// See #TODO.md "Unified Game Context" section.

import { useUser } from '@clerk/nextjs';
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

import type { GameAdapter } from './game-adapters';
import { LocalGameAdapter, OnlineGameAdapter } from './game-adapters';
import type { GameState } from './game-types';
import { localGame } from './local-game';

export interface GameContextType {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  updateGame: (updates: Partial<GameState>) => Promise<void>;
  refresh: () => Promise<void>;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: React.ReactNode;
  roomCode: string;
  initialMode?: 'online' | 'local'; // Optional hint, otherwise we infer
}

export function GameProvider({ children, roomCode, initialMode }: GameProviderProps) {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which adapter to use
  // If we have a user and not explicitly local, use Online.
  // If we found a local game with this roomCode, use Local.
  // This logic might need refinement. For now, strict separation:
  // If the game exists in localStorage, prefer LocalAdapter?
  // Or maybe pass a prop?
  const adapter: GameAdapter = useMemo(() => {
    // If we passed an explicit mode, trust it
    if (initialMode === 'local') return new LocalGameAdapter();
    if (initialMode === 'online') return new OnlineGameAdapter();

    // Heuristic: check if local game exists
    const local = localGame.get(roomCode);
    if (local) return new LocalGameAdapter();

    // Default to online
    return new OnlineGameAdapter();
  }, [initialMode, roomCode]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const game = await adapter.get(roomCode);
      setGameState(game);
    } catch (err) {
      console.error('Failed to refresh game:', err);
      // Don't set global error on refresh failure, just log it
    }
  }, [adapter, roomCode]);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      // Wait for Clerk to load if we are in online mode
      // (This is a bit tricky since adapter is sync-created, but online adapter needs auth cookies which are handled by browser)
      // Actually, OnlineGameAdapter uses fetch(), so it just needs the session cookie.
      // But we might want to wait for `isClerkLoaded` before declaring "Ready" if we depend on `user`.
      if (!isClerkLoaded && adapter instanceof OnlineGameAdapter) return;

      setIsLoading(true);
      try {
        const game = await adapter.get(roomCode);
        if (isMounted) {
          setGameState(game);
          setIsLoading(false);
        }

        // Subscribe
        subscription = adapter.subscribe(roomCode, (updatedGame) => {
          if (isMounted) {
            setGameState(updatedGame);
          }
        });
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [adapter, roomCode, isClerkLoaded]);

  const updateGame = useCallback(
    async (updates: Partial<GameState>) => {
      try {
        const updated = await adapter.update(roomCode, updates);
        setGameState(updated);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update game';
        // We might want to expose this error to the UI via the context
        // For now, we rely on the component handling the promise rejection if they await it,
        // OR we set the global error state.
        // Let's throw it so the component can handle it (e.g. show toast)
        throw new Error(msg);
      }
    },
    [adapter, roomCode]
  );

  const value = {
    gameState,
    isLoading,
    error,
    updateGame,
    refresh,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
