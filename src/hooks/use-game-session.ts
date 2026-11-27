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

/**
 * Local (one device) games pass the device around. After every change, hand
 * it to the first player who still owes an action at this step: an answer to
 * the current question during play, otherwise a ready-up. When nobody owes
 * anything (a transition just reset everyone), it goes back to player one.
 */
export function nextLocalPlayerIndex(state: GameState): number {
  const players = state.players;
  if (state.step === 'game') {
    const round = state.gameRounds.find((r) => r.question === state.currentQuestion);
    const unanswered = players.findIndex((p) => !round?.answers[p.id]);
    if (unanswered >= 0) return unanswered;
  }
  if (state.step === 'summary') return 0;
  const notReady = players.findIndex((p) => !p.isReady);
  return notReady >= 0 ? notReady : 0;
}

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

    // Deliberately not awaited: this is an effect body. Every failure path
    // inside initializeGame is already caught and surfaced through setError, so
    // `void` records that the floating promise is intentional rather than an
    // unhandled rejection waiting to happen.
    void initializeGame();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [roomCode, user, isLoaded, router, isInvalidRoomCode, toast]);

  /**
   * Applies a state update and returns the state the server now holds, or
   * null if the write failed.
   *
   * Errors are toasted rather than thrown, so callers that discard local input
   * on completion — the answer textarea, for one — need to know the write
   * actually landed. Callers that check "is everyone ready?" must use the
   * returned state, not their own pre-write copy: when both partners click at
   * once, each local copy still shows the other as not ready, so neither
   * would advance and the room would hang.
   */
  const updateGameState = useCallback(
    async (newState: Partial<GameState>): Promise<GameState | null> => {
      try {
        const currentState = stateRef.current;
        if (currentState?.gameMode === 'local') {
          const merged = { ...currentState, ...newState } as GameState;
          const updated = localGame.update(roomCode, {
            ...newState,
            currentPlayerIndex: nextLocalPlayerIndex(merged),
          });
          if (updated) {
            setGameState(updated);
            return updated;
          }
          throw new Error('Failed to update local game');
        }

        const updated = await clientGame.update(roomCode, newState);
        setGameState(updated);
        return updated;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Update failed';
        toast({
          title: 'Update Failed',
          description: message,
          variant: 'destructive',
        });
        return null;
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
