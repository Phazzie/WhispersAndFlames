'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';
import { clientAuth } from '@/lib/client-auth';
import { clientGame } from '@/lib/client-game';
import type { GameState, Player } from '@/lib/game-types';

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
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    clientAuth.getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push(`/?join=${roomCode}`);
      }
    });
  }, [roomCode, router]);

  useEffect(() => {
    if (!currentUser) return;

    // Initial fetch
    clientGame
      .get(roomCode)
      .then((game) => {
        setGameState(game);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });

    // Subscribe to updates
    const subscription = clientGame.subscribe(roomCode, (game) => {
      setGameState(game);
    });

    return () => subscription.unsubscribe();
  }, [roomCode, currentUser]);

  const updateGameState = useCallback(
    async (newState: Partial<GameState>) => {
      try {
        const updated = await clientGame.update(roomCode, newState);
        setGameState(updated);
      } catch (err: any) {
        toast({
          title: 'Update Failed',
          description: err.message,
          variant: 'destructive',
        });
      }
    },
    [roomCode, toast]
  );

  if (isLoading) return <LoadingScreen />;
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
  if (!gameState || !currentUser) return <LoadingScreen />;

  const me = gameState.players.find((p) => p.id === currentUser.id);
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
