import type {
  generateQuestionAction,
  analyzeAndSummarizeAction,
  generateTherapistNotesAction,
  generateVisualMemoryAction,
} from '@/app/game/actions';

import type { SPICY_LEVELS } from './constants';

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
export type GameMode = 'online' | 'local'; // online = multi-device, local = single-device

export type GameState = {
  step: GameStep;
  players: Player[];
  playerIds: string[];
  hostId: string;
  gameMode: GameMode; // Determines if game is online or local multi-player
  currentPlayerIndex?: number; // For local mode: which player's turn it is
  commonCategories: string[];
  finalSpicyLevel: SpicyLevel['name'];
  chaosMode: boolean;
  gameRounds: GameRound[];
  currentQuestion: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  summary: string;
  visualMemories?: Array<{
    imageUrl: string;
    prompt: string;
    timestamp: number;
  }>;
  imageGenerationCount: number;
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
    generateTherapistNotesAction: typeof generateTherapistNotesAction;
    generateVisualMemoryAction: typeof generateVisualMemoryAction;
    router: any; // Simplified NextRouter
  };
};
