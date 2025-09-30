
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, type DocumentReference } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { GameState, Player, SpicyLevel, GameStep } from '@/lib/game-types';
import { generateQuestionAction, analyzeAndSummarizeAction } from '../actions';
import { SPICY_LEVELS, QUESTIONS_PER_CATEGORY } from '@/lib/constants';

import { GameLayout } from './game-layout';
import { LobbyStep } from './steps/lobby-step';
import { CategoriesStep } from './steps/categories-step';
import { SpicyStep } from './steps/spicy-step';
import { GamePlayStep } from './steps/game-step';
import { SummaryStep } from './steps/summary-step';
import { LoadingScreen } from './loading-screen';

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useMemo(() => doc(db, 'games', roomCode), [roomCode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push(`/?join=${roomCode}`);
      }
    });
    return () => unsubscribe();
  }, [router, roomCode]);

  useEffect(() => {
    if (!roomCode || !currentUser) return;

    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        const isNewUser = !data.playerIds.includes(currentUser.uid);

        if (isNewUser && data.players.length < 2) {
          const newPlayerName = `Player ${data.players.length + 1}`;
          const newPlayer: Player = { id: currentUser.uid, name: newPlayerName, isReady: false, email: currentUser.email!, selectedCategories: [] };
          await updateDoc(roomRef, {
            players: [...data.players, newPlayer],
            playerIds: [...data.playerIds, currentUser.uid]
          });
        } else {
          setGameState(data);
        }
      } else {
        const newPlayerName = 'Player 1';
        const newGame: GameState = {
          step: 'lobby',
          players: [{ id: currentUser.uid, name: newPlayerName, isReady: false, email: currentUser.email!, selectedCategories: [] }],
          playerIds: [currentUser.uid],
          hostId: currentUser.uid,
          commonCategories: [],
          finalSpicyLevel: 'Mild',
          gameRounds: [],
          currentQuestion: '',
          currentQuestionIndex: 0,
          totalQuestions: 0,
          summary: '',
        };
        await setDoc(roomRef, newGame);
        setGameState(newGame);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [roomCode, currentUser, roomRef]);

  const me = useMemo(() => gameState?.players.find(p => p.id === currentUser?.uid), [gameState, currentUser]);

  const updateGameState = async (newState: Partial<GameState>) => {
    await updateDoc(roomRef, newState as any);
  };

  const handlers = {
    updateGameState,
    getDoc,
    roomRef,
    toast,
    setIsLoading,
    setError,
    generateQuestionAction,
    analyzeAndSummarizeAction,
    router,
  };

  if (isLoading || !gameState || !me) {
    return <LoadingScreen message={isLoading ? undefined : "Setting up your game..."} />;
  }

  const renderStepContent = () => {
    switch (gameState.step) {
      case 'lobby':
        return <LobbyStep gameState={gameState} me={me} handlers={handlers} />;
      case 'categories':
        return <CategoriesStep gameState={gameState} me={me} handlers={handlers} />;
      case 'spicy':
        return <SpicyStep gameState={gameState} me={me} handlers={handlers} />;
      case 'game':
        return <GamePlayStep gameState={gameState} me={me} handlers={handlers} />;
      case 'summary':
        return <SummaryStep gameState={gameState} me={me} handlers={handlers} />;
      default:
        return <LoadingScreen message="An unexpected error occurred." />;
    }
  };

  return (
    <GameLayout gameState={gameState} error={error}>
      {renderStepContent()}
    </GameLayout>
  );
}
