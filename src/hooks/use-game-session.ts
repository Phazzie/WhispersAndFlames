'use client';

import type { UserResource } from '@clerk/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clientGame } from '@/lib/client-game';
import type { GameState } from '@/lib/game-types';
import { localGame } from '@/lib/local-game';

type ToastFn = (options: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}) => void;

type UseGameSessionParams = {
  roomCode: string;
  isInvalidRoomCode: boolean;
  user: UserResource | null | undefined;
  isLoaded: boolean;
  router: AppRouterInstance;
  toast: ToastFn;
};

export function useGameSession({
  roomCode,
  isInvalidRoomCode,
  user,
  isLoaded,
  router,
  toast,
}: UseGameSessionParams) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof clientGame.subscribe> | null>(null);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (isInvalidRoomCode) return;
    if (!isLoaded) return;

    let isMounted = true;
    const initializeGame = async () => {
      try {
        const local = localGame.get(roomCode);
        if (local?.gameMode === 'local') {
          if (!isMounted) return;
          setGameState(local);
          setIsLoading(false);
          return;
        }

        if (!user) {
          router.push(`/?join=${roomCode}`);
          return;
        }

        const game = await clientGame.get(roomCode);
        if (!isMounted) return;

        setGameState(game);
        setIsLoading(false);

        subscriptionRef.current = clientGame.subscribe(roomCode, (nextGame) => {
          if (!isMounted) return;
          const previous = stateRef.current;
          if (
            previous &&
            nextGame.gameRounds.length > previous.gameRounds.length &&
            nextGame.step === 'game'
          ) {
            toast({
              title: 'New update',
              description: 'Your partner just answered.',
            });
          }
          setGameState(nextGame);
        });
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load game';
        setError(message);
        setIsLoading(false);
      }
    };

    initializeGame();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [roomCode, user, isLoaded, router, isInvalidRoomCode, toast]);

  const updateGameState = useCallback(
    async (newState: Partial<GameState>) => {
      try {
        const currentState = stateRef.current;
        if (currentState?.gameMode === 'local') {
          const updated = localGame.update(roomCode, newState);
          if (updated) {
            setGameState(updated);
            return;
          }
          throw new Error('Failed to update local game');
        }

        const updated = await clientGame.update(roomCode, newState);
        setGameState(updated);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Update failed';
        toast({
          title: 'Update Failed',
          description: message,
          variant: 'destructive',
        });
      }
    },
    [roomCode, toast]
  );

  return {
    gameState,
    isLoading,
    error,
    setError,
    updateGameState,
  };
}
