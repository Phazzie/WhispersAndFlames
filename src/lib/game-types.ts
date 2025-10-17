import type { SPICY_LEVELS } from './constants';
import type { generateQuestionAction, analyzeAndSummarizeAction } from '@/app/game/actions';

export type GameStep = 'lobby' | 'categories' | 'spicy' | 'game' | 'summary';
export type SpicyLevel = (typeof SPICY_LEVELS)[number];
export type Player = {
  id: string;
  name: string;
  isReady: boolean;
  email: string;
  selectedCategories: string[];
  selectedSpicyLevel?: SpicyLevel['name'];
};
export type GameRound = { question: string; answers: Record<string, string> };

export type GameState = {
  step: GameStep;
  players: Player[];
  playerIds: string[];
  hostId: string;
  commonCategories: string[];
  finalSpicyLevel: SpicyLevel['name'];
  gameRounds: GameRound[];
  currentQuestion: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  summary: string;
  roomCode: string;
  createdAt?: Date;
  completedAt?: Date;
};

export type StepProps = {
  gameState: GameState;
  me: Player;
  handlers: {
    roomCode: string;
    updateGameState: (newState: Partial<GameState>) => Promise<void>;
    toast: (options: {
      title: string;
      description?: string;
      variant?: 'default' | 'destructive';
      duration?: number;
    }) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    generateQuestionAction: typeof generateQuestionAction;
    analyzeAndSummarizeAction: typeof analyzeAndSummarizeAction;
    router: any; // Simplified NextRouter
  };
};
