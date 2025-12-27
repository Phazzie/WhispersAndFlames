// #TODO: Implement GameProvider context.
// This context should expose a unified API for game interactions, abstracting away the underlying storage/networking.
// See #TODO.md "Unified Game Context" section.

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

import {
  generateQuestionAction,
  analyzeAndSummarizeAction,
  generateTherapistNotesAction,
  generateVisualMemoryAction,
} from '@/app/game/actions';
import { useToast } from '@/hooks/use-toast';

import {
  LocalGameAdapter,
  OnlineGameAdapter,
  type GameAdapter,
} from './game-adapters';
import type { GameState } from './game-types';
import { localGame } from './local-game';

export interface GameContextType {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  roomCode: string;
  updateGameState: (newState: Partial<GameState>) => Promise<void>;
  generateQuestionAction: typeof generateQuestionAction;
  analyzeAndSummarizeAction: typeof analyzeAndSummarizeAction;
  generateTherapistNotesAction: typeof generateTherapistNotesAction;
  generateVisualMemoryAction: typeof generateVisualMemoryAction;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
  roomCode: string;
}

export function GameProvider({ children, roomCode }: GameProviderProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<GameAdapter | null>(null);

  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Initialize Adapter and Game State
  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initialize = async () => {
      // Wait for user auth state to be known before deciding on strategy?
      // Actually, we can check local first.

      try {
        // 1. Check Local Game
        // We use the synchronous method first to avoid flicker if possible
        const localState = localGame.get(roomCode);

        if (localState) {
          const localAdapter = new LocalGameAdapter();
          if (isMounted) {
            setAdapter(localAdapter);
            setGameState(localState);
            setIsLoading(false);
          }

          subscription = localAdapter.subscribe(roomCode, (game) => {
            if (isMounted) setGameState(game);
          });
          return;
        }

        // 2. If not local, wait for Clerk to load
        if (!isUserLoaded) return;

        // 3. Check Online Game
        if (user) {
          const onlineAdapter = new OnlineGameAdapter();
          if (isMounted) setAdapter(onlineAdapter);

          try {
            const onlineState = await onlineAdapter.get(roomCode);
            if (isMounted) {
                setGameState(onlineState);
                setIsLoading(false);
            }

            subscription = onlineAdapter.subscribe(roomCode, (game) => {
                if (isMounted) setGameState(game);
            });
          } catch (err) {
             if (isMounted) {
               console.error('Failed to load online game:', err);
               setError(err instanceof Error ? err.message : 'Failed to load game');
               setIsLoading(false);
             }
          }
        } else {
            // Not local, and not logged in (or not loaded yet)
            // If we are sure it's not local, and user is not logged in, we can't access online game.
            // Redirect to join page?
            if (isMounted) {
                 // Check if it looks like a local game ID? (Unreliable)
                 // Just assume if it's not in local storage, it must be online.
                 // If not logged in, redirect to login/join.
                 router.push(`/?join=${roomCode}`);
                 setIsLoading(false);
            }
        }

      } catch (err) {
        if (isMounted) {
            console.error('Game initialization error:', err);
            setError('An unexpected error occurred.');
            setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [roomCode, user, isUserLoaded, router]);


  const updateGameState = useCallback(async (updates: Partial<GameState>) => {
    if (!adapter) {
        console.warn('Cannot update game state: No adapter initialized');
        return;
    }

    try {
        const updated = await adapter.update(roomCode, updates);
        setGameState(updated);
    } catch (err) {
        console.error('Update failed:', err);
        const message = err instanceof Error ? err.message : 'Update failed';
        toast({
            title: 'Update Failed',
            description: message,
            variant: 'destructive',
        });
        throw err;
    }
  }, [adapter, roomCode, toast]);

  const value: GameContextType = {
    gameState,
    isLoading,
    error,
    roomCode,
    updateGameState,
    generateQuestionAction,
    analyzeAndSummarizeAction,
    generateTherapistNotesAction,
    generateVisualMemoryAction,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
