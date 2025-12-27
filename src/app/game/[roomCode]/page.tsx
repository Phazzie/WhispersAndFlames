'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';

import { ErrorBoundary } from '@/components/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { GameProvider, useGame } from '@/lib/game-context';

import { GameLayout } from './game-layout';
import { LoadingScreen } from './loading-screen';
import { CategoriesStep } from './steps/categories-step';
import { GamePlayStep } from './steps/game-step';
import { LobbyStep } from './steps/lobby-step';
import { SpicyStep } from './steps/spicy-step';
import { SummaryStep } from './steps/summary-step';

function GameContent() {
  const { gameState, isLoading, error, updateGameState, ...actions } = useGame();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // Loading state
  if (isLoading) return <LoadingScreen />;

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

  // Determine "me" (current player)
  // In Online mode, this matches the Clerk user ID.
  // In Local mode, we treat the "current player" as "me" if we are taking turns,
  // OR we might be an admin of the whole session.
  // For simplicity in Local Mode:
  // - In Lobby: We probably want to be able to edit ANY player, or just the host?
  //   Actually, local mode lobby usually has just 1 input for players, or inputs for all players.
  //   The current LobbyStep expects `me` to be one specific player.
  //   We might need to fake "me" as the first player or the host for now.
  //   Or we can adapt LobbyStep later to handle local mode (editing all players).

  // Let's derive `me`.
  let me = null;

  if (gameState.gameMode === 'local') {
    // In local mode, we use the current player index to determine "me"
    // This allows the UI to show the perspective of the active player
    const currentIndex = gameState.currentPlayerIndex || 0;
    me = gameState.players[currentIndex] || gameState.players[0];
  } else {
    // Online mode
    if (user) {
      me = gameState.players.find((p) => p.id === user.id);
    }
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
    updateGameState,
    toast,
    setIsLoading: () => {}, // No-op as provider handles loading mostly
    setError: () => {}, // No-op
    router,
    generateQuestionAction: actions.generateQuestionAction,
    analyzeAndSummarizeAction: actions.analyzeAndSummarizeAction,
    generateTherapistNotesAction: actions.generateTherapistNotesAction,
    generateVisualMemoryAction: actions.generateVisualMemoryAction,
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
