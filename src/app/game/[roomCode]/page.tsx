'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

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

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoaded } = useUser();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roomCodeParam = params.roomCode;

  // Validate roomCode parameter
  const isInvalidRoomCode = !roomCodeParam || Array.isArray(roomCodeParam);
  const roomCode = isInvalidRoomCode ? '' : roomCodeParam;

  useEffect(() => {
    // Skip if invalid room code
    if (isInvalidRoomCode) return;

    // If Clerk hasn't loaded yet, wait
    if (!isLoaded) return;

    // If no user, redirect to home with join parameter
    if (!user) {
      router.push(`/?join=${roomCode}`);
      return;
    }

    let isMounted = true;
    let subscription: ReturnType<typeof clientGame.subscribe> | null = null;

    const initializeGame = async () => {
      try {
        // Initial fetch
        const game = await clientGame.get(roomCode);
        if (!isMounted) return;

        setGameState(game);
        setIsLoading(false);

        // Subscribe to updates
        subscription = clientGame.subscribe(roomCode, (game) => {
          if (isMounted) {
            setGameState(game);
          }
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
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [roomCode, user, isLoaded, router, isInvalidRoomCode]);

  const updateGameState = useCallback(
    async (newState: Partial<GameState>) => {
      try {
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

  // Invalid room code
  if (isInvalidRoomCode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Room Code</h2>
          <p>Please check your room code and try again.</p>
        </div>
      </div>
    );
  }

  // Loading state - waiting for Clerk or game data
  if (!isLoaded || isLoading) return <LoadingScreen />;

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // No user or game state
  if (!gameState || !user) return <LoadingScreen />;

  // Check if current user is in the game
  const me = gameState.players.find((p) => p.id === user.id);
  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not in Game</h2>
          <p>You are not a player in this game.</p>
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
