'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { useGameSession } from '@/hooks/use-game-session';
import { useToast } from '@/hooks/use-toast';

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
  // Local games share one device: whose turn the screen was last handed to.
  const [handedToPlayerId, setHandedToPlayerId] = useState<string | null>(null);

  const roomCodeParam = params.roomCode;

  // Validate roomCode parameter
  const isInvalidRoomCode = !roomCodeParam || Array.isArray(roomCodeParam);
  const roomCode = isInvalidRoomCode ? '' : roomCodeParam;

  const { gameState, isLoading, error, updateGameState } = useGameSession({
    roomCode,
    isInvalidRoomCode,
    user,
    isLoaded,
    router,
    toast,
  });

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
          <h2 className="text-2xl font-bold mb-4">
            {error.toLowerCase().includes('room not found') ? 'Room not found' : 'Error'}
          </h2>
          <p>{error}</p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // No user or game state
  if (!gameState) return <LoadingScreen />;

  // Check if current user is in the game
  const currentUserId =
    gameState.gameMode === 'local'
      ? gameState.players[gameState.currentPlayerIndex ?? 0]?.id
      : user?.id;
  const me = gameState.players.find((p) => p.id === currentUserId);
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

  // Pass-the-device screen: hides the previous player's screen until the next
  // player confirms they are holding the device.
  if (gameState.gameMode === 'local' && handedToPlayerId !== me.id) {
    return (
      <GameLayout gameState={gameState} error={error}>
        <div className="w-full max-w-md text-center space-y-6 py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Pass the device</p>
          <h2 className="text-4xl font-bold">{me.name}, you&apos;re up.</h2>
          <p className="text-muted-foreground">
            Everyone else, eyes elsewhere. No peeking at answers.
          </p>
          <Button size="lg" className="w-full" onClick={() => setHandedToPlayerId(me.id)}>
            I&apos;m {me.name}, show me
          </Button>
        </div>
      </GameLayout>
    );
  }

  const sharedHandlers = {
    roomCode,
    updateGameState,
    toast,
    router,
  };

  let StepComponent;
  switch (gameState.step) {
    case 'lobby':
      StepComponent = (
        <LobbyStep key={me.id} gameState={gameState} me={me} handlers={sharedHandlers} />
      );
      break;
    case 'categories':
      StepComponent = (
        <CategoriesStep key={me.id} gameState={gameState} me={me} handlers={sharedHandlers} />
      );
      break;
    case 'spicy':
      StepComponent = (
        <SpicyStep
          key={me.id}
          gameState={gameState}
          me={me}
          handlers={{ ...sharedHandlers, generateQuestionAction }}
        />
      );
      break;
    case 'game':
      StepComponent = (
        <GamePlayStep
          key={me.id}
          gameState={gameState}
          me={me}
          handlers={{ ...sharedHandlers, generateQuestionAction, analyzeAndSummarizeAction }}
        />
      );
      break;
    case 'summary':
      StepComponent = (
        <SummaryStep
          gameState={gameState}
          me={me}
          handlers={{ ...sharedHandlers, generateTherapistNotesAction, generateVisualMemoryAction }}
        />
      );
      break;
    default:
      StepComponent = <div>Unknown step: {gameState.step}</div>;
  }

  return (
    <ErrorBoundary>
      <GameLayout gameState={gameState} error={error}>
        {StepComponent}
      </GameLayout>
    </ErrorBoundary>
  );
}
