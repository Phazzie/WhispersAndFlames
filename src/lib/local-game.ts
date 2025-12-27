/**
 * Local game storage for single-device multi-player mode
 * Stores game state in localStorage without requiring authentication
 */

import type { GameState, Player } from './game-types';
import { generateRoomCode } from './game-utils';

const STORAGE_KEY_PREFIX = 'local-game:';
const ACTIVE_GAME_KEY = 'local-game:active';

// Helper to revive dates from JSON
const dateReviver = (key: string, value: any) => {
  if (key === 'createdAt' || key === 'completedAt' || key === 'updatedAt') {
    return new Date(value);
  }
  return value;
};

// Safe storage wrapper to handle errors
const safeStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return null;
    }
  },
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e instanceof DOMException &&
          (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.error('LocalStorage quota exceeded');
        // Optional: Could emit an event or return false to let caller handle it
      } else {
        console.error('Error writing to localStorage:', e);
      }
      return false;
    }
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from localStorage:', e);
    }
  }
};

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

    const now = new Date();
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
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const success = safeStorage.set(`${STORAGE_KEY_PREFIX}${roomCode}`, JSON.stringify(gameState));
      if (success) {
        safeStorage.set(ACTIVE_GAME_KEY, roomCode);
      } else {
        // Fallback or error handling if needed
        console.warn('Failed to save new game to local storage');
      }
    }

    return gameState;
  },

  /**
   * Get the current local game
   */
  getCurrent: (): GameState | null => {
    if (typeof window === 'undefined') return null;

    const roomCode = safeStorage.get(ACTIVE_GAME_KEY);
    if (!roomCode) return null;

    return localGame.get(roomCode);
  },

  /**
   * Get a specific local game by room code
   */
  get: (roomCode: string): GameState | null => {
    if (typeof window === 'undefined') return null;

    const stored = safeStorage.get(`${STORAGE_KEY_PREFIX}${roomCode}`);
    if (!stored) return null;

    try {
      return JSON.parse(stored, dateReviver);
    } catch {
      return null;
    }
  },

  /**
   * Update local game state with conflict resolution
   */
  update: (roomCode: string, updates: Partial<GameState>): GameState | null => {
    if (typeof window === 'undefined') return null;

    const key = `${STORAGE_KEY_PREFIX}${roomCode}`;

    // Read the latest state from storage directly to minimize race window
    const stored = safeStorage.get(key);
    if (!stored) return null;

    let currentState: GameState;
    try {
      currentState = JSON.parse(stored, dateReviver);
    } catch {
      return null;
    }

    // Apply updates
    const updated: GameState = {
      ...currentState,
      ...updates,
      updatedAt: new Date(),
      version: (currentState.version || 0) + 1,
    };

    // Conflict Resolution:
    // If 'version' is passed in updates, it implies the caller knew about a specific version.
    // However, the caller usually passes functional updates.
    // Here we are doing a "Last Writer Wins" but ensuring we build upon the LATEST stored state.
    // This handles the case where Tab A and Tab B both try to update.
    // If Tab A calls update({ step: 'game' }) and Tab B calls update({ chaosMode: true }),
    // and they run sequentially (even if fetched earlier), this function refetches 'currentState' right before merging.
    // So if Tab A finishes first, 'stored' will contain Tab A's changes when Tab B runs.
    // Tab B will merge { chaosMode: true } into Tab A's result.
    // This is the best we can do with synchronous localStorage.

    const success = safeStorage.set(key, JSON.stringify(updated));
    if (!success) {
        // If quota exceeded, we might want to notify user, but return null indicates failure here?
        // Or return existing state?
        console.error("Failed to persist update to local storage");
        // We'll return the updated state anyway so the UI updates, even if persistence failed temporarily
    }

    return updated;
  },

  /**
   * Delete local game
   */
  delete: (roomCode: string): void => {
    if (typeof window === 'undefined') return;

    safeStorage.remove(`${STORAGE_KEY_PREFIX}${roomCode}`);
    const activeGame = safeStorage.get(ACTIVE_GAME_KEY);
    if (activeGame === roomCode) {
      safeStorage.remove(ACTIVE_GAME_KEY);
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
        const stored = safeStorage.get(key);
        if (stored) {
          try {
            games.push(JSON.parse(stored, dateReviver));
          } catch {
            // Skip invalid entries
          }
        }
      }
    }
    // Sort by updated recently
    return games.sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt || new Date(0);
        const dateB = b.updatedAt || b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
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
