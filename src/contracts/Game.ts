/**
 * Game Service Contract
 *
 * This file defines the complete contract for the Game service following Seam-Driven Development.
 * All implementations (mock and real) must conform to these interfaces and pass the same contract tests.
 *
 * @module contracts/Game
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Game progression steps
 */
export type GameStep = 'lobby' | 'categories' | 'spicy' | 'game' | 'summary';

/**
 * Spicy level intensity for questions
 */
export type SpicyLevel = 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot';

/**
 * Available intimacy categories (from constants.ts)
 */
export type Category =
  | 'Hidden Attractions'
  | 'Power Play'
  | 'Emotional Depths'
  | 'Mind Games'
  | 'Shared Pasts'
  | 'Future Dreams'
  | 'Core Values'
  | 'Bright Ideas'
  | 'Trust & Alliance'
  | 'The Unspeakable';

/**
 * Game mode - determines device configuration
 */
export type GameMode = 'online' | 'local';

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const gameStepSchema = z.enum(['lobby', 'categories', 'spicy', 'game', 'summary']);
export const spicyLevelSchema = z.enum(['Mild', 'Medium', 'Hot', 'Extra-Hot']);
export const categorySchema = z.enum([
  'Hidden Attractions',
  'Power Play',
  'Emotional Depths',
  'Mind Games',
  'Shared Pasts',
  'Future Dreams',
  'Core Values',
  'Bright Ideas',
  'Trust & Alliance',
  'The Unspeakable',
]);
export const gameModeSchema = z.enum(['online', 'local']);

export const playerSeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  isReady: z.boolean(),
  selectedCategories: z.array(categorySchema),
  spicyVote: spicyLevelSchema.optional(),
});

export const gameRoundSchema = z.object({
  question: z.string(),
  answers: z.record(z.string(), z.string()),
});

export const visualMemoryItemSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string(),
  timestamp: z.number(),
});

export const visualMemorySeamSchema = z.object({
  imagePrompt: z.string(),
  safetyLevel: z.enum(['safe', 'moderate']),
});

export const gameSeamSchema = z.object({
  roomCode: z.string().length(6),
  hostId: z.string().min(1),
  players: z.array(playerSeamSchema),
  playerIds: z.array(z.string()),
  step: gameStepSchema,
  gameMode: gameModeSchema,
  currentPlayerIndex: z.number().int().min(0).optional(),
  commonCategories: z.array(categorySchema),
  finalSpicyLevel: spicyLevelSchema,
  chaosMode: z.boolean(),
  gameRounds: z.array(gameRoundSchema),
  currentQuestion: z.string(),
  currentQuestionIndex: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  summary: z.string(),
  therapistNotes: z.string().nullable(),
  visualMemories: z.array(visualMemoryItemSchema).optional(),
  imageGenerationCount: z.number().int().min(0),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

// ============================================================================
// Interface Definitions (The "Seams")
// ============================================================================

/**
 * Represents a player in the game
 */
export interface PlayerSeam {
  /** Unique player identifier (matches Clerk user ID) */
  id: string;

  /** Player's display name */
  name: string;

  /** Player's email address */
  email: string;

  /** Whether player has readied up in lobby */
  isReady: boolean;

  /** Categories selected by this player */
  selectedCategories: Category[];

  /** Player's vote for spicy level (if submitted) */
  spicyVote?: SpicyLevel;
}

/**
 * Represents a single question-answer round
 */
export interface GameRound {
  /** The question asked */
  question: string;

  /** Map of player ID to their answer */
  answers: Record<string, string>;
}

/**
 * Represents a visual memory (AI-generated image)
 */
export interface VisualMemory {
  /** URL to the generated image */
  imageUrl: string;

  /** The prompt used to generate the image */
  prompt: string;

  /** Unix timestamp when generated */
  timestamp: number;
}

/**
 * Visual memory prompt with safety level
 */
export interface VisualMemorySeam {
  /** Abstract art prompt (safe for AI image generation) */
  imagePrompt: string;

  /** Safety level rating (never 'explicit') */
  safetyLevel: 'safe' | 'moderate';
}

/**
 * Complete game state
 * This is the core data structure that flows through the entire application
 */
export interface GameSeam {
  /** Unique 6-character room code (uppercase alphanumeric) */
  roomCode: string;

  /** User ID of the player who created the game */
  hostId: string;

  /** Array of players in the game (1-3 players) */
  players: PlayerSeam[];

  /** Array of player IDs for quick lookups */
  playerIds: string[];

  /** Current step in the game flow */
  step: GameStep;

  /** Game mode: online (multi-device) or local (single-device) */
  gameMode: GameMode;

  /** For local mode: index of current player's turn */
  currentPlayerIndex?: number;

  /** Categories selected by all players (intersection) */
  commonCategories: Category[];

  /** Final spicy level after voting (most conservative wins) */
  finalSpicyLevel: SpicyLevel;

  /** Whether chaos mode is enabled (random spicy upgrades) */
  chaosMode: boolean;

  /** All question-answer rounds completed */
  gameRounds: GameRound[];

  /** The current question being answered */
  currentQuestion: string;

  /** Index of current question (0-based) */
  currentQuestionIndex: number;

  /** Total number of questions for this session */
  totalQuestions: number;

  /** AI-generated summary of the session */
  summary: string;

  /** AI-generated therapist notes (Dr. Ember) */
  therapistNotes: string | null;

  /** Array of visual memories (AI-generated images) */
  visualMemories?: VisualMemory[];

  /** Number of images generated this session */
  imageGenerationCount: number;

  /** When the game was created */
  createdAt: Date;

  /** When the game will expire (24 hours after creation) */
  expiresAt: Date;

  /** When the game was completed (if finished) */
  completedAt?: Date;
}

/**
 * Input for creating a new game
 */
export interface CreateGameInput {
  /** ID of the user creating the game */
  hostId: string;

  /** Display name for the host player */
  playerName: string;

  /** Email address of the host player */
  email: string;

  /** Game mode (defaults to 'online') */
  gameMode?: GameMode;
}

/**
 * Input for joining an existing game
 */
export interface JoinGameInput {
  /** Room code to join */
  roomCode: string;

  /** ID of the player joining */
  playerId: string;

  /** Display name for the joining player */
  playerName: string;

  /** Email address of the joining player */
  email: string;
}

/**
 * Input for updating player-specific data
 */
export interface UpdatePlayerInput {
  /** Room code */
  roomCode: string;

  /** Player ID to update */
  playerId: string;

  /** Partial player updates */
  updates: Partial<Omit<PlayerSeam, 'id'>>;
}

/**
 * Subscription callback for game updates
 */
export type GameUpdateCallback = (game: GameSeam) => void;

/**
 * Unsubscribe function returned by subscribe
 */
export type UnsubscribeFunction = () => void;

// ============================================================================
// Service Interface (The Primary Seam)
// ============================================================================

/**
 * Game Service Interface
 *
 * This interface defines all operations for managing game state.
 * Both mock and real implementations must implement this interface
 * and pass the same contract tests.
 *
 * @interface IGameService
 */
export interface IGameService {
  /**
   * Creates a new game session
   *
   * @param input - Game creation parameters
   * @returns Promise resolving to the created game state
   * @throws Error if player name is invalid or game creation fails
   *
   * @example
   * ```typescript
   * const game = await gameService.createGame({
   *   hostId: 'user-123',
   *   playerName: 'Alice',
   *   email: 'alice@example.com',
   *   gameMode: 'online'
   * });
   * console.log(game.roomCode); // "ABC123"
   * ```
   */
  createGame(input: CreateGameInput): Promise<GameSeam>;

  /**
   * Adds a player to an existing game
   *
   * @param input - Join game parameters
   * @returns Promise resolving to updated game state
   * @throws Error if game not found, game is full (3 players max), or player already in game
   *
   * @example
   * ```typescript
   * const game = await gameService.joinGame({
   *   roomCode: 'ABC123',
   *   playerId: 'user-456',
   *   playerName: 'Bob',
   *   email: 'bob@example.com'
   * });
   * console.log(game.players.length); // 2
   * ```
   */
  joinGame(input: JoinGameInput): Promise<GameSeam>;

  /**
   * Retrieves current game state
   *
   * @param roomCode - The room code to fetch
   * @returns Promise resolving to game state or null if not found
   *
   * @example
   * ```typescript
   * const game = await gameService.getGame('ABC123');
   * if (game) {
   *   console.log(`Game has ${game.players.length} players`);
   * }
   * ```
   */
  getGame(roomCode: string): Promise<GameSeam | null>;

  /**
   * Updates game state (partial update)
   *
   * @param roomCode - The room code to update
   * @param updates - Partial game state to merge
   * @returns Promise resolving to updated game state
   * @throws Error if game not found
   *
   * @example
   * ```typescript
   * const game = await gameService.updateGame('ABC123', {
   *   step: 'categories',
   *   chaosMode: true
   * });
   * ```
   */
  updateGame(roomCode: string, updates: Partial<GameSeam>): Promise<GameSeam>;

  /**
   * Updates a specific player's data
   *
   * @param input - Player update parameters
   * @returns Promise resolving to updated game state
   * @throws Error if game or player not found
   *
   * @example
   * ```typescript
   * const game = await gameService.updatePlayer({
   *   roomCode: 'ABC123',
   *   playerId: 'user-123',
   *   updates: {
   *     isReady: true,
   *     selectedCategories: ['Power Play', 'Hidden Attractions']
   *   }
   * });
   * ```
   */
  updatePlayer(input: UpdatePlayerInput): Promise<GameSeam>;

  /**
   * Deletes a game session
   *
   * @param roomCode - The room code to delete
   * @returns Promise resolving when deletion is complete
   * @throws Never throws (idempotent - safe to call on non-existent game)
   *
   * @example
   * ```typescript
   * await gameService.deleteGame('ABC123');
   * ```
   */
  deleteGame(roomCode: string): Promise<void>;

  /**
   * Subscribes to game state changes
   *
   * Returns an unsubscribe function that should be called to stop receiving updates
   *
   * @param roomCode - The room code to subscribe to
   * @param callback - Function called whenever game state changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = gameService.subscribe('ABC123', (game) => {
   *   console.log('Game updated:', game.step);
   * });
   *
   * // Later...
   * unsubscribe();
   * ```
   */
  subscribe(roomCode: string, callback: GameUpdateCallback): UnsubscribeFunction;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates and parses game data from unknown source (e.g., API response)
 *
 * @param data - Unknown data to validate
 * @returns Validated GameSeam object
 * @throws ZodError if validation fails
 */
export function validateGameSeam(data: unknown): GameSeam {
  return gameSeamSchema.parse(data);
}

/**
 * Validates and parses player data from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated PlayerSeam object
 * @throws ZodError if validation fails
 */
export function validatePlayerSeam(data: unknown): PlayerSeam {
  return playerSeamSchema.parse(data);
}

/**
 * Validates and parses visual memory seam data from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated VisualMemorySeam object
 * @throws ZodError if validation fails
 */
export function validateVisualMemorySeam(data: unknown): VisualMemorySeam {
  return visualMemorySeamSchema.parse(data);
}

/**
 * Type guard to check if a value is a valid GameStep
 */
export function isGameStep(value: unknown): value is GameStep {
  return gameStepSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is a valid SpicyLevel
 */
export function isSpicyLevel(value: unknown): value is SpicyLevel {
  return spicyLevelSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is a valid Category
 */
export function isCategory(value: unknown): value is Category {
  return categorySchema.safeParse(value).success;
}
