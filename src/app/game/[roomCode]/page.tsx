'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';

import { ErrorBoundary } from '@/components/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { GameProvider, useGame } from '@/lib/game-context';

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

import { useEffect } from 'react';

function GameContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoaded } = useUser();
  const { gameState, isLoading, error, updateGame } = useGame();

  useEffect(() => {
    // Redirect logic for unauthenticated users in online mode
    if (isLoaded && !user && gameState?.gameMode === 'online') {
      router.push(`/?join=${gameState.roomCode}`);
    }
  }, [isLoaded, user, gameState, router]);

  // Loading state
  // If loading, or if we have no user but seem to be in an online game (and effect hasn't fired yet), show loading
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

  // No game state
  if (!gameState) return <LoadingScreen />;

  // User verification
  // For online games, we need to make sure the Clerk user is the player.
  // For local games, we might need a different way to identify "me".
  // For now, if we are in local mode, we assume the first player is "me" or handle it differently.
  // But wait, the previous code required `user` to exist.
  // If we are in local mode, `user` (Clerk) might be null!

  // Logic:
  // If gameMode is 'local', "me" is the current player (hotseat) or we need a way to select.
  // Since we don't have multi-device local yet, let's assume "me" is the currentPlayerIndex?
  // Or simply pass `null` for `me` if local, and let the components handle it?
  // The components (LobbyStep etc) expect `me: Player`.

  let me = null;
  if (gameState.gameMode === 'local') {
    // In local mode, we are effectively "all players" or the "active player".
    // For now, let's pretend to be the first player or the host to satisfy UI.
    // Ideally, we refactor Step components to not rely on "me" for local mode.
    me = gameState.players[gameState.currentPlayerIndex || 0];
  } else {
    // Online mode: strict check
    if (!user) {
        // Should not happen if we redirect in parent, but safety check
         return <LoadingScreen />;
    }
    me = gameState.players.find((p) => p.id === user.id);
  }

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
    roomCode: gameState.roomCode,
    updateGameState: updateGame,
    toast,
    setIsLoading: () => {}, // No-op, managed by context
    setError: () => {}, // No-op, managed by context
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

export default function GamePage() {
  const params = useParams();
  const roomCodeParam = params.roomCode;

  // Validate roomCode parameter
  const isInvalidRoomCode = !roomCodeParam || Array.isArray(roomCodeParam);
  const roomCode = isInvalidRoomCode ? '' : roomCodeParam;

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

  return (
    <ErrorBoundary>
      <GameProvider roomCode={roomCode}>
        <GameContent />
      </GameProvider>
    </ErrorBoundary>
  );
}
