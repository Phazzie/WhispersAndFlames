/**
 * Local game storage for single-device multi-player mode
 * Stores game state in localStorage without requiring authentication
 */

import type { GameState, Player } from './game-types';
import { generateRoomCode } from './game-utils';

const STORAGE_KEY_PREFIX = 'local-game:';
const ACTIVE_GAME_KEY = 'local-game:active';

export const localGame = {
  /**
   * Create a new local game with 1-3 players
   */
  create: (playerNames: string[]): GameState => {
    if (playerNames.length < 1 || playerNames.length > 3) {
      throw new Error('Local games must have 1-3 players');
    }

    const roomCode = generateRoomCode();
    const players: Player[] = playerNames.map((name, index) => ({
      id: `local-player-${index + 1}`,
      name: name.trim() || `Player ${index + 1}`,
      email: `player${index + 1}@local`,
      isReady: false,
      selectedCategories: [],
    }));

    const gameState: GameState = {
      step: 'lobby',
      players,
      playerIds: players.map((p) => p.id),
      hostId: players[0].id,
      gameMode: 'local',
      currentPlayerIndex: 0,
      commonCategories: [],
      finalSpicyLevel: 'Mild',
      chaosMode: false,
      gameRounds: [],
      currentQuestion: '',
      currentQuestionIndex: 0,
      totalQuestions: 0,
      summary: '',
      imageGenerationCount: 0,
      roomCode,
      createdAt: new Date(),
    };

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${roomCode}`, JSON.stringify(gameState));
      localStorage.setItem(ACTIVE_GAME_KEY, roomCode);
    }

    return gameState;
  },

  /**
   * Get the current local game
   */
  getCurrent: (): GameState | null => {
    if (typeof window === 'undefined') return null;

    const roomCode = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!roomCode) return null;

    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${roomCode}`);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  /**
   * Get a specific local game by room code
   */
  get: (roomCode: string): GameState | null => {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${roomCode}`);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  /**
   * Update local game state
   */
  update: (roomCode: string, updates: Partial<GameState>): GameState | null => {
    if (typeof window === 'undefined') return null;

    const game = localGame.get(roomCode);
    if (!game) return null;

    const updated = { ...game, ...updates };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${roomCode}`, JSON.stringify(updated));
    return updated;
  },

  /**
   * Delete local game
   */
  delete: (roomCode: string): void => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${roomCode}`);
    const activeGame = localStorage.getItem(ACTIVE_GAME_KEY);
    if (activeGame === roomCode) {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  },

  /**
   * List all local games
   */
  listAll: (): GameState[] => {
    if (typeof window === 'undefined') return [];

    const games: GameState[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX) && key !== ACTIVE_GAME_KEY) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            games.push(JSON.parse(stored));
          } catch {
            // Skip invalid entries
          }
        }
      }
    }
    return games;
  },

  /**
   * Move to next player in local mode
   */
  nextPlayer: (gameState: GameState): GameState => {
    if (gameState.gameMode !== 'local') {
      throw new Error('nextPlayer can only be used in local mode');
    }

    const currentIndex = gameState.currentPlayerIndex || 0;
    const nextIndex = (currentIndex + 1) % gameState.players.length;

    return {
      ...gameState,
      currentPlayerIndex: nextIndex,
    };
  },

  /**
   * Get the current player in local mode
   */
  getCurrentPlayer: (gameState: GameState): Player | null => {
    if (gameState.gameMode !== 'local') return null;

    const index = gameState.currentPlayerIndex || 0;
    return gameState.players[index] || null;
  },
};

// #TODO: Add methods to handle game actions in local mode
// - updatePlayerName
// - setPlayerReady
// - submitAnswer
// - nextStep
// These should mimic the API behavior but operate synchronously on localStorage
