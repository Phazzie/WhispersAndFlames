'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Sheet, Stamp } from '@/components/dossier';
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

function DeadEnd({
  stamp,
  title,
  body,
  onBack,
}: {
  stamp: string;
  title: string;
  body: string;
  onBack: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Sheet className="max-w-md" form="Notice" file="Returned to sender" tilt={-0.8}>
        <Stamp className="text-2xl" tilt={-10}>
          {stamp}
        </Stamp>
        <h1 className="mt-6 font-typewriter text-2xl">{title}</h1>
        <p className="mt-3 text-card-foreground/80">{body}</p>
        <Button className="mt-6 w-full font-typewriter uppercase tracking-widest" onClick={onBack}>
          Back to the front desk
        </Button>
      </Sheet>
    </main>
  );
}

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
      <DeadEnd
        stamp="Bad codename"
        title="That codename doesn't parse"
        body="Check the codename on your partner's file and try again."
        onBack={() => router.push('/')}
      />
    );
  }

  // Loading state - waiting for Clerk or game data
  if (!isLoaded || isLoading) return <LoadingScreen />;

  // Error state
  if (error) {
    return (
      <DeadEnd
        stamp={error.toLowerCase().includes('not found') ? 'No such file' : 'Access denied'}
        title={
          error.toLowerCase().includes('not found')
            ? 'Room not found'
            : 'Error: this file is above your clearance'
        }
        body={error}
        onBack={() => router.push('/')}
      />
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
      <DeadEnd
        stamp="Not on the list"
        title="You are not a player in this game"
        body="This file belongs to other agents. Ask them for an invite link."
        onBack={() => router.push('/')}
      />
    );
  }

  // Pass-the-device screen: hides the previous player's screen until the next
  // player confirms they are holding the device.
  if (gameState.gameMode === 'local' && handedToPlayerId !== me.id) {
    return (
      <GameLayout gameState={gameState} error={error}>
        <Sheet className="max-w-md text-center" form="Custody transfer" file="Sealed">
          <Stamp className="text-xl" tilt={-6}>
            Hand-off
          </Stamp>
          <h2 className="mt-6 font-typewriter text-3xl sm:text-4xl">
            Pass the file to <span className="font-hand text-5xl text-accent">{me.name}</span>
          </h2>
          <p className="mt-4 text-card-foreground/80">
            Everyone else, eyes on the ceiling. Statements stay sealed until every agent has talked.
          </p>
          <Button
            size="lg"
            className="mt-8 w-full font-typewriter uppercase tracking-widest"
            onClick={() => setHandedToPlayerId(me.id)}
          >
            I&apos;m {me.name}, show me
          </Button>
        </Sheet>
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
