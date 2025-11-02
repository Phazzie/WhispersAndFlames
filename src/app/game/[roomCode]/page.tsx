'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { usePlayerIdentity } from '@/hooks/use-player-identity';
import { useToast } from '@/hooks/use-toast';
import { clientGame } from '@/lib/client-game';
import type { GameState } from '@/lib/game-types';

import {
  generateQuestionAction,
  analyzeAndSummarizeAction,
  generateTherapistNotesAction,
  generateVisualMemoryAction,
} from '../actions';

import { GameLayout } from './game-layout';
import { LoadingScreen } from './loading-screen';
import { CategoriesStep } from './steps/categories-step';
import { GamePlayStep } from './steps/game-step';
import { LobbyStep } from './steps/lobby-step';
import { SpicyStep } from './steps/spicy-step';
import { SummaryStep } from './steps/summary-step';

type ClientError = Error & { status?: number };

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();
  const { identity, hydrated } = usePlayerIdentity();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!identity) {
      setError('Missing player identity');
      setIsLoading(false);
      return;
    }

    const trimmedName = identity.name.trim();
    if (!trimmedName) {
      router.push(`/?join=${roomCode}`);
      return;
    }

    let isActive = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const game = await clientGame.get(roomCode, identity.id);
        if (!isActive) return;
        setGameState(game);
        subscription = clientGame.subscribe(roomCode, identity.id, (state) => {
          setGameState(state);
        });
      } catch (err: unknown) {
        const status = (err as ClientError | undefined)?.status;
        if (status === 403) {
          try {
            const joined = await clientGame.join(roomCode, { ...identity, name: trimmedName });
            if (!isActive) return;
            setGameState(joined);
            subscription = clientGame.subscribe(roomCode, identity.id, (state) => {
              setGameState(state);
            });
          } catch (joinError: unknown) {
            if (!isActive) return;
            const message = joinError instanceof Error ? joinError.message : 'Failed to join game';
            setError(message);
            toast({
              title: 'Join failed',
              description: message || 'Please try again.',
              variant: 'destructive',
            });
          }
        } else if (status === 404) {
          setError('This room no longer exists.');
        } else {
          const message = err instanceof Error ? err.message : 'Unable to load game';
          setError(message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, [hydrated, identity, roomCode, router, toast]);

  const updateGameState = useCallback(
    async (newState: Partial<GameState>) => {
      if (!identity) return;
      try {
        const updated = await clientGame.update(roomCode, identity.id, newState);
        setGameState(updated);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        toast({
          title: 'Update Failed',
          description: message,
          variant: 'destructive',
        });
      }
    },
    [identity, roomCode, toast]
  );

  if (isLoading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  if (!gameState || !identity) return <LoadingScreen />;

  const me = gameState.players.find((p) => p.id === identity.id);
  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Not in Game</h2>
          <p className="text-muted-foreground">You are not a player in this game.</p>
          <button
            onClick={() => router.push(`/?join=${roomCode}`)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Rejoin the lobby
          </button>
        </div>
      </div>
    );
  }

  const handlers = {
    roomCode,
    updateGameState,
    toast,
    setIsLoading,
    setError,
    generateQuestionAction,
    analyzeAndSummarizeAction,
    generateTherapistNotesAction,
    generateVisualMemoryAction,
    router,
  };

  const stepProps = { gameState, me, handlers };

  let StepComponent;
  switch (gameState.step) {
    case 'lobby':
      StepComponent = <LobbyStep {...stepProps} />;
      break;
    case 'categories':
      StepComponent = <CategoriesStep {...stepProps} />;
      break;
    case 'spicy':
      StepComponent = <SpicyStep {...stepProps} />;
      break;
    case 'game':
      StepComponent = <GamePlayStep {...stepProps} />;
      break;
    case 'summary':
      StepComponent = <SummaryStep {...stepProps} />;
      break;
    default:
      StepComponent = <div>Unknown step: {gameState.step}</div>;
  }

  return (
    <GameLayout gameState={gameState} error={error}>
      {StepComponent}
    </GameLayout>
  );
}
