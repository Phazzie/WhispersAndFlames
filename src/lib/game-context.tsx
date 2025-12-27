// #TODO: Implement GameProvider context.
// This context should expose a unified API for game interactions, abstracting away the underlying storage/networking.
// See #TODO.md "Unified Game Context" section.

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { GameState, GameMode } from './game-types';
import { type GameAdapter, OnlineGameAdapter, LocalGameAdapter } from './game-adapters';

interface GameContextType {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  adapter: GameAdapter | null;
  refresh: () => Promise<void>;
  updateGame: (updates: Partial<GameState>) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: React.ReactNode;
  roomCode: string;
  gameMode?: GameMode;
  initialGameState?: GameState | null;
}

export function GameProvider({
  children,
  roomCode,
  gameMode = 'online', // Default to online
  initialGameState = null,
}: GameProviderProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [isLoading, setIsLoading] = useState<boolean>(!initialGameState);
  const [error, setError] = useState<string | null>(null);

  // Track if the component is mounted to prevent state updates on unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const adapter = useMemo(() => {
    if (gameMode === 'local') {
      return new LocalGameAdapter();
    }
    return new OnlineGameAdapter();
  }, [gameMode]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const game = await adapter.get(roomCode);
      if (isMountedRef.current) {
        setGameState(game);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to refresh game:', err);
        setError('Failed to refresh game state');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [adapter, roomCode]);

  const updateGame = useCallback(
    async (updates: Partial<GameState>) => {
      try {
        // Optimistic update
        setGameState((prev) => (prev ? { ...prev, ...updates } : null));

        const updatedGame = await adapter.update(roomCode, updates);
        if (isMountedRef.current) {
            setGameState(updatedGame);
            setError(null);
        }
      } catch (err) {
        console.error('Failed to update game:', err);
        if (isMountedRef.current) {
            setError('Failed to update game state');
            // Revert or refresh on error
            refresh();
        }
        throw err;
      }
    },
    [adapter, roomCode, refresh]
  );

  // Combine initial fetch and subscription to avoid race conditions and double work
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isActive = true;

    const init = async () => {
      // If we don't have initial state, or if the roomCode changed (implied by dependency change),
      // we might want to fetch fresh state.
      // However, subscription will also give us updates.
      // Typically, it's safer to fetch once then subscribe, or just subscribe if subscription gives initial state.
      // Assuming subscribe might not give initial state immediately, we fetch first.

      if (!initialGameState) {
          try {
            if (isActive) setIsLoading(true);
            const game = await adapter.get(roomCode);
            if (isActive) {
                setGameState(game);
                setError(null);
                setIsLoading(false);
            }
          } catch (err) {
             if (isActive) {
                console.error('Failed to init game:', err);
                setError('Failed to initialize game');
                setIsLoading(false);
             }
          }
      }

      if (isActive) {
          const subscription = adapter.subscribe(roomCode, (game) => {
            if (isActive) {
                setGameState(game);
            }
          });
          unsubscribe = subscription.unsubscribe;
      }
    };

    init();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [adapter, roomCode, initialGameState]); // Re-run if adapter or roomCode changes

  const value = useMemo(
    () => ({
      gameState,
      isLoading,
      error,
      adapter,
      refresh,
      updateGame,
    }),
    [gameState, isLoading, error, adapter, refresh, updateGame]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
