
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { GameState, Player } from '@/lib/game-types';
import { generateQuestionAction, analyzeAndSummarizeAction } from '../actions';

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
    // Auth listener
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push(`/?join=${roomCode}`);
      }
    });

    return () => authUnsubscribe();
  }, [router, roomCode]);


  useEffect(() => {
    if (!currentUser) return;

    // Firestore listener
    const gameUnsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        
        // If player is not in game, add them (if space available)
        if (!data.playerIds.includes(currentUser.uid)) {
          if (data.players.length < 3) {
            const newPlayer: Player = { 
              id: currentUser.uid, 
              name: `Player ${data.players.length + 1}`, 
              isReady: false, 
              email: currentUser.email!, 
              selectedCategories: [] 
            };
            updateDoc(roomRef, {
              players: arrayUnion(newPlayer),
              playerIds: arrayUnion(currentUser.uid)
            });
          } else {
             // Game is full
             toast({title: "Room Full", description: "This game room is already full.", variant: "destructive"});
             router.push('/');
          }
        } else {
          setGameState({ ...data, roomCode });
        }

      } else {
         // Game does not exist, create it for the current user
         const newPlayer: Player = { id: currentUser.uid, name: 'Player 1', isReady: false, email: currentUser.email!, selectedCategories: [] };
         const newGame: GameState = {
            step: 'lobby',
            players: [newPlayer],
            playerIds: [currentUser.uid],
            hostId: currentUser.uid,
            commonCategories: [],
            finalSpicyLevel: 'Mild',
            gameRounds: [],
            currentQuestion: '',
            currentQuestionIndex: 0,
            totalQuestions: 0,
            summary: '',
            roomCode,
            createdAt: serverTimestamp() as any, // Use server timestamp
          };
          setDoc(roomRef, newGame);
      }
      setIsLoading(false);
    }, (err) => {
        console.error("Snapshot error:", err);
        setError("Could not connect to the game session.");
        setIsLoading(false);
    });

    return () => gameUnsubscribe();

  }, [currentUser, roomCode, roomRef, router, toast]);

  const me = useMemo(() => gameState?.players.find(p => p.id === currentUser?.uid), [gameState, currentUser]);

  const updateGameState = useCallback(async (newState: Partial<GameState>) => {
    try {
        await updateDoc(roomRef, newState as any);
    } catch (e: any) {
        console.error("Error updating game state:", e);
        setError("There was an issue updating the game. Please try again.");
    }
  },[roomRef]);

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
    return <LoadingScreen message={isLoading ? undefined : "Joining game..."} />;
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
