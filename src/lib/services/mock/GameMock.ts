/**
 * Game Mock Service
 * Production-quality mock implementation of IGameService
 * Passes all contract tests and feels REAL to the UI
 */

import type {
  IGameService,
  GameSeam,
  PlayerSeam,
  CreateGameInput,
  JoinGameInput,
  UpdatePlayerInput,
  GameUpdateCallback,
  UnsubscribeFunction,
} from '@/contracts/Game';

// Utility function for realistic network delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate unique room code (animal-based pattern)
function generateRoomCode(): string {
  const animals = [
    'LION',
    'TIGER',
    'BEAR',
    'WOLF',
    'FOX',
    'EAGLE',
    'SHARK',
    'PANTHER',
    'LEOPARD',
    'JAGUAR',
    'COBRA',
    'DRAGON',
    'PHOENIX',
    'HAWK',
    'FALCON',
    'OWL',
    'RAVEN',
  ];

  const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const parts = new Set<string>();
  while (parts.size < 3) {
    parts.add(getRandomItem(animals));
  }
  const number = Math.floor(10 + Math.random() * 90); // 10-99

  return `${[...parts].join('-')}-${number}`;
}

export class GameMockService implements IGameService {
  private games: Map<string, GameSeam> = new Map();
  private subscriptions: Map<string, Set<GameUpdateCallback>> = new Map();

  async createGame(input: CreateGameInput): Promise<GameSeam> {
    // Simulate network delay (200ms)
    await delay(200);

    const { hostId, playerName, email, gameMode = 'online' } = input;

    // Validate inputs (matching real service behavior)
    if (!playerName?.trim()) {
      throw new Error('Player name is required');
    }

    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    if (!hostId?.trim()) {
      throw new Error('Host ID is required');
    }

    const roomCode = generateRoomCode();
    const now = new Date();

    const game: GameSeam = {
      roomCode,
      hostId,
      players: [
        {
          id: hostId,
          name: playerName.trim(),
          email: email.trim(),
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [hostId],
      step: 'lobby',
      gameMode,
      commonCategories: [],
      finalSpicyLevel: 'Mild',
      chaosMode: false,
      gameRounds: [],
      currentQuestion: '',
      currentQuestionIndex: 0,
      totalQuestions: 0,
      summary: '',
      therapistNotes: null,
      visualMemories: [],
      imageGenerationCount: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.games.set(roomCode, game);
    return structuredClone(game); // Return deep copy to prevent external mutations
  }

  async joinGame(input: JoinGameInput): Promise<GameSeam> {
    await delay(150);

    const { roomCode, playerId, playerName, email } = input;

    // Validate inputs
    if (!roomCode?.trim()) {
      throw new Error('Room code is required');
    }

    if (!playerId?.trim()) {
      throw new Error('Player ID is required');
    }

    if (!playerName?.trim()) {
      throw new Error('Player name is required');
    }

    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    const game = this.games.get(roomCode.toUpperCase());
    if (!game) {
      throw new Error('Game not found');
    }

    // Enforce 3-player limit
    if (game.players.length >= 3) {
      throw new Error('Game is full');
    }

    // Prevent duplicate player IDs
    if (game.players.some((p) => p.id === playerId)) {
      throw new Error('Player already in game');
    }

    // Add new player
    game.players.push({
      id: playerId,
      name: playerName.trim(),
      email: email.trim(),
      isReady: false,
      selectedCategories: [],
    });
    game.playerIds.push(playerId);

    // Notify subscribers
    this.notifySubscribers(roomCode, game);

    return structuredClone(game);
  }

  async getGame(roomCode: string): Promise<GameSeam | null> {
    await delay(100);

    if (!roomCode?.trim()) {
      return null;
    }

    const game = this.games.get(roomCode.toUpperCase());
    return game ? structuredClone(game) : null;
  }

  async updateGame(roomCode: string, updates: Partial<GameSeam>): Promise<GameSeam> {
    await delay(150);

    if (!roomCode?.trim()) {
      throw new Error('Room code is required');
    }

    const game = this.games.get(roomCode.toUpperCase());
    if (!game) {
      throw new Error('Game not found');
    }

    // Apply updates (preserve unchanged fields)
    Object.assign(game, updates);

    // Notify subscribers
    this.notifySubscribers(roomCode, game);

    return structuredClone(game);
  }

  async updatePlayer(input: UpdatePlayerInput): Promise<GameSeam> {
    await delay(150);

    const { roomCode, playerId, updates } = input;

    if (!roomCode?.trim()) {
      throw new Error('Room code is required');
    }

    if (!playerId?.trim()) {
      throw new Error('Player ID is required');
    }

    const game = this.games.get(roomCode.toUpperCase());
    if (!game) {
      throw new Error('Game not found');
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Apply updates to player
    Object.assign(player, updates);

    // Notify subscribers
    this.notifySubscribers(roomCode, game);

    return structuredClone(game);
  }

  async deleteGame(roomCode: string): Promise<void> {
    await delay(100);

    if (roomCode?.trim()) {
      const normalizedCode = roomCode.toUpperCase();
      this.games.delete(normalizedCode);
      this.subscriptions.delete(normalizedCode);
    }
  }

  subscribe(roomCode: string, callback: GameUpdateCallback): UnsubscribeFunction {
    const normalizedCode = roomCode.toUpperCase();

    if (!this.subscriptions.has(normalizedCode)) {
      this.subscriptions.set(normalizedCode, new Set());
    }

    this.subscriptions.get(normalizedCode)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(normalizedCode)?.delete(callback);
    };
  }

  private notifySubscribers(roomCode: string, game: GameSeam): void {
    const normalizedCode = roomCode.toUpperCase();
    const callbacks = this.subscriptions.get(normalizedCode);

    if (callbacks) {
      // Notify all subscribers with a deep copy
      callbacks.forEach((cb) => {
        // Wrap in setTimeout to simulate async behavior
        setTimeout(() => cb(structuredClone(game)), 0);
      });
    }
  }
}
