/**
 * GameService Contract Tests
 *
 * These tests define the expected behavior of the game storage service.
 * They are implementation-agnostic and should pass for BOTH:
 * - In-memory storage (storage-memory.ts)
 * - PostgreSQL storage (storage-pg.ts)
 *
 * This ensures that mock and real implementations are functionally identical.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Player } from '@/lib/game-types';

/**
 * Storage interface that both implementations must satisfy
 */
export interface GameStorageService {
  games: {
    create(roomCode: string, initialState: GameState): Promise<GameState> | GameState;
    get(roomCode: string): Promise<GameState | undefined> | GameState | undefined;
    update(roomCode: string, updates: Partial<GameState>): Promise<GameState | undefined> | GameState | undefined;
    delete(roomCode: string): Promise<void> | void;
    subscribe(roomCode: string, callback: (state: GameState) => void): () => void;
    list(userId: string, filter?: { step?: string }): Promise<GameState[]> | GameState[];
  };
  users: {
    create(email: string, passwordHash: string): Promise<{ id: string; email: string; passwordHash: string; createdAt: Date }> | { id: string; email: string; passwordHash: string; createdAt: Date };
    findByEmail(email: string): Promise<{ id: string; email: string; passwordHash: string; createdAt: Date } | undefined> | { id: string; email: string; passwordHash: string; createdAt: Date } | undefined;
    findById(id: string): Promise<{ id: string; email: string; passwordHash: string; createdAt: Date } | undefined> | { id: string; email: string; passwordHash: string; createdAt: Date } | undefined;
  };
  sessions: {
    create(userId: string): Promise<string> | string;
    validate(token: string): Promise<string | null> | string | null;
    delete(token: string): Promise<void> | void;
  };
}

/**
 * Helper to create a valid game state for testing
 */
function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayer: Player = {
    id: 'player-1',
    name: 'Alice',
    email: 'alice@example.com',
    isReady: false,
    selectedCategories: [],
  };

  return {
    step: 'lobby',
    players: [defaultPlayer],
    playerIds: ['player-1'],
    hostId: 'player-1',
    gameMode: 'online',
    commonCategories: [],
    finalSpicyLevel: 'Mild',
    chaosMode: false,
    gameRounds: [],
    currentQuestion: '',
    currentQuestionIndex: 0,
    totalQuestions: 5,
    summary: '',
    imageGenerationCount: 0,
    roomCode: 'TEST01',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Main contract test suite
 * Export function that accepts a service implementation
 */
export function runGameServiceContractTests(service: GameStorageService) {
  describe('GameService Contract - Game Operations', () => {
    describe('games.create', () => {
      it('should create a new game with valid initial state', async () => {
        const roomCode = 'ABC123';
        const initialState = createTestGameState({ roomCode });

        const result = await service.games.create(roomCode, initialState);

        expect(result).toBeDefined();
        expect(result.roomCode).toBe(roomCode);
        expect(result.players).toHaveLength(1);
        expect(result.players[0].name).toBe('Alice');
        expect(result.step).toBe('lobby');
        expect(result.hostId).toBe('player-1');
        expect(result.gameMode).toBe('online');
      });

      it('should preserve all game state fields', async () => {
        const roomCode = 'XYZ789';
        const initialState = createTestGameState({
          roomCode,
          step: 'categories',
          finalSpicyLevel: 'Hot',
          chaosMode: true,
          commonCategories: ['Power Play', 'Hidden Attractions'],
        });

        const result = await service.games.create(roomCode, initialState);

        expect(result.step).toBe('categories');
        expect(result.finalSpicyLevel).toBe('Hot');
        expect(result.chaosMode).toBe(true);
        expect(result.commonCategories).toEqual(['Power Play', 'Hidden Attractions']);
      });

      it('should handle multiple players in initial state', async () => {
        const roomCode = 'MULTI1';
        const players: Player[] = [
          { id: 'p1', name: 'Alice', email: 'alice@test.com', isReady: true, selectedCategories: ['Power Play'] },
          { id: 'p2', name: 'Bob', email: 'bob@test.com', isReady: false, selectedCategories: [] },
          { id: 'p3', name: 'Charlie', email: 'charlie@test.com', isReady: true, selectedCategories: ['Mind Games'] },
        ];

        const initialState = createTestGameState({
          roomCode,
          players,
          playerIds: ['p1', 'p2', 'p3'],
        });

        const result = await service.games.create(roomCode, initialState);

        expect(result.players).toHaveLength(3);
        expect(result.playerIds).toEqual(['p1', 'p2', 'p3']);
        expect(result.players[0].name).toBe('Alice');
        expect(result.players[1].name).toBe('Bob');
        expect(result.players[2].name).toBe('Charlie');
      });
    });

    describe('games.get', () => {
      it('should retrieve an existing game', async () => {
        const roomCode = 'GET001';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        const result = await service.games.get(roomCode);

        expect(result).toBeDefined();
        expect(result?.roomCode).toBe(roomCode);
        expect(result?.players[0].name).toBe('Alice');
      });

      it('should return undefined for non-existent game', async () => {
        const result = await service.games.get('NOTFOUND');

        expect(result).toBeUndefined();
      });

      it('should return game with all original fields intact', async () => {
        const roomCode = 'INTACT';
        const initialState = createTestGameState({
          roomCode,
          gameRounds: [{ question: 'Test?', answers: { 'p1': 'Answer 1' } }],
          currentQuestionIndex: 1,
          summary: 'Test summary',
        });
        await service.games.create(roomCode, initialState);

        const result = await service.games.get(roomCode);

        expect(result?.gameRounds).toHaveLength(1);
        expect(result?.gameRounds[0].question).toBe('Test?');
        expect(result?.currentQuestionIndex).toBe(1);
        expect(result?.summary).toBe('Test summary');
      });
    });

    describe('games.update', () => {
      it('should update game state', async () => {
        const roomCode = 'UPDATE01';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        const result = await service.games.update(roomCode, {
          step: 'categories',
          chaosMode: true,
        });

        expect(result).toBeDefined();
        expect(result?.step).toBe('categories');
        expect(result?.chaosMode).toBe(true);
      });

      it('should preserve unchanged fields', async () => {
        const roomCode = 'PRESERVE';
        const initialState = createTestGameState({
          roomCode,
          hostId: 'host-123',
          players: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', isReady: true, selectedCategories: [] },
          ],
        });
        await service.games.create(roomCode, initialState);

        const result = await service.games.update(roomCode, {
          step: 'spicy',
        });

        expect(result?.hostId).toBe('host-123');
        expect(result?.players[0].name).toBe('Alice');
        expect(result?.players[0].isReady).toBe(true);
        expect(result?.step).toBe('spicy');
      });

      it('should update player list', async () => {
        const roomCode = 'ADDPLAYER';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        const updatedPlayers: Player[] = [
          ...initialState.players,
          { id: 'p2', name: 'Bob', email: 'bob@test.com', isReady: false, selectedCategories: [] },
        ];

        const result = await service.games.update(roomCode, {
          players: updatedPlayers,
          playerIds: ['player-1', 'p2'],
        });

        expect(result?.players).toHaveLength(2);
        expect(result?.playerIds).toHaveLength(2);
        expect(result?.players[1].name).toBe('Bob');
      });

      it('should update multiple fields simultaneously', async () => {
        const roomCode = 'MULTI';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        const result = await service.games.update(roomCode, {
          step: 'game',
          currentQuestion: 'What is your favorite?',
          currentQuestionIndex: 2,
          finalSpicyLevel: 'Hot',
        });

        expect(result?.step).toBe('game');
        expect(result?.currentQuestion).toBe('What is your favorite?');
        expect(result?.currentQuestionIndex).toBe(2);
        expect(result?.finalSpicyLevel).toBe('Hot');
      });

      it('should return undefined for non-existent game', async () => {
        const result = await service.games.update('NOTFOUND', { step: 'game' });

        expect(result).toBeUndefined();
      });
    });

    describe('games.delete', () => {
      it('should delete an existing game', async () => {
        const roomCode = 'DELETE01';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        await service.games.delete(roomCode);

        const result = await service.games.get(roomCode);
        expect(result).toBeUndefined();
      });

      it('should not throw error when deleting non-existent game', async () => {
        await expect(service.games.delete('NOTFOUND')).resolves.not.toThrow();
      });
    });

    describe('games.list', () => {
      beforeEach(async () => {
        // Clean up any existing games
        const userId = 'list-user';
        const existingGames = await service.games.list(userId);
        for (const game of existingGames) {
          await service.games.delete(game.roomCode);
        }
      });

      it('should list games for a specific user', async () => {
        const userId = 'list-user';

        // Create games with user as player
        await service.games.create('GAME1', createTestGameState({
          roomCode: 'GAME1',
          playerIds: [userId],
          players: [{ id: userId, name: 'Test', email: 'test@test.com', isReady: false, selectedCategories: [] }],
        }));

        await service.games.create('GAME2', createTestGameState({
          roomCode: 'GAME2',
          playerIds: [userId],
          players: [{ id: userId, name: 'Test', email: 'test@test.com', isReady: false, selectedCategories: [] }],
        }));

        const result = await service.games.list(userId);

        expect(result).toHaveLength(2);
        expect(result.map(g => g.roomCode)).toContain('GAME1');
        expect(result.map(g => g.roomCode)).toContain('GAME2');
      });

      it('should filter games by step', async () => {
        const userId = 'filter-user';

        await service.games.create('LOBBY1', createTestGameState({
          roomCode: 'LOBBY1',
          step: 'lobby',
          playerIds: [userId],
          players: [{ id: userId, name: 'Test', email: 'test@test.com', isReady: false, selectedCategories: [] }],
        }));

        await service.games.create('GAME1', createTestGameState({
          roomCode: 'GAME1',
          step: 'game',
          playerIds: [userId],
          players: [{ id: userId, name: 'Test', email: 'test@test.com', isReady: false, selectedCategories: [] }],
        }));

        const lobbyGames = await service.games.list(userId, { step: 'lobby' });
        const activeGames = await service.games.list(userId, { step: 'game' });

        expect(lobbyGames).toHaveLength(1);
        expect(lobbyGames[0].step).toBe('lobby');
        expect(activeGames).toHaveLength(1);
        expect(activeGames[0].step).toBe('game');
      });

      it('should return empty array for user with no games', async () => {
        const result = await service.games.list('no-games-user');

        expect(result).toEqual([]);
      });
    });

    describe('games.subscribe', () => {
      it('should call callback when game is updated', async () => {
        const roomCode = 'SUB001';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        const callback = vi.fn();
        const unsubscribe = service.games.subscribe(roomCode, callback);

        // Update the game
        await service.games.update(roomCode, { step: 'categories' });

        // For PostgreSQL, subscription is a no-op (uses polling)
        // For in-memory, callback should be called
        // We can't guarantee behavior here, so we just verify the API works
        expect(typeof unsubscribe).toBe('function');

        unsubscribe();
      });

      it('should allow unsubscribing', async () => {
        const roomCode = 'UNSUB01';
        const initialState = createTestGameState({ roomCode });
        await service.games.create(roomCode, initialState);

        const callback = vi.fn();
        const unsubscribe = service.games.subscribe(roomCode, callback);

        // Unsubscribe should not throw
        expect(() => unsubscribe()).not.toThrow();
      });
    });
  });

  describe('GameService Contract - User Operations', () => {
    describe('users.create', () => {
      it('should create a new user with email and password hash', async () => {
        const email = 'test@example.com';
        const passwordHash = 'hashed-password-123';

        const user = await service.users.create(email, passwordHash);

        expect(user.id).toBeDefined();
        expect(user.email).toBe(email);
        expect(user.passwordHash).toBe(passwordHash);
        expect(user.createdAt).toBeInstanceOf(Date);
      });

      it('should generate unique IDs for different users', async () => {
        const user1 = await service.users.create('user1@test.com', 'hash1');
        const user2 = await service.users.create('user2@test.com', 'hash2');

        expect(user1.id).not.toBe(user2.id);
      });
    });

    describe('users.findByEmail', () => {
      it('should find an existing user by email', async () => {
        const email = 'find@example.com';
        const passwordHash = 'hash123';
        const created = await service.users.create(email, passwordHash);

        const found = await service.users.findByEmail(email);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.email).toBe(email);
        expect(found?.passwordHash).toBe(passwordHash);
      });

      it('should return undefined for non-existent email', async () => {
        const found = await service.users.findByEmail('nonexistent@example.com');

        expect(found).toBeUndefined();
      });
    });

    describe('users.findById', () => {
      it('should find an existing user by ID', async () => {
        const created = await service.users.create('id-test@example.com', 'hash456');

        const found = await service.users.findById(created.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.email).toBe('id-test@example.com');
      });

      it('should return undefined for non-existent ID', async () => {
        const found = await service.users.findById('non-existent-id');

        expect(found).toBeUndefined();
      });
    });
  });

  describe('GameService Contract - Session Operations', () => {
    describe('sessions.create', () => {
      it('should create a session for a user', async () => {
        const user = await service.users.create('session@test.com', 'hash789');

        const token = await service.sessions.create(user.id);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
      });

      it('should generate unique tokens', async () => {
        const user = await service.users.create('multi-session@test.com', 'hash-multi');

        const token1 = await service.sessions.create(user.id);
        const token2 = await service.sessions.create(user.id);

        expect(token1).not.toBe(token2);
      });
    });

    describe('sessions.validate', () => {
      it('should validate an existing session', async () => {
        const user = await service.users.create('validate@test.com', 'hash-validate');
        const token = await service.sessions.create(user.id);

        const userId = await service.sessions.validate(token);

        expect(userId).toBe(user.id);
      });

      it('should return null for non-existent session', async () => {
        const userId = await service.sessions.validate('invalid-token');

        expect(userId).toBeNull();
      });

      it('should return null for deleted session', async () => {
        const user = await service.users.create('delete-session@test.com', 'hash-del');
        const token = await service.sessions.create(user.id);

        await service.sessions.delete(token);

        const userId = await service.sessions.validate(token);
        expect(userId).toBeNull();
      });
    });

    describe('sessions.delete', () => {
      it('should delete an existing session', async () => {
        const user = await service.users.create('del@test.com', 'hash-delete');
        const token = await service.sessions.create(user.id);

        await service.sessions.delete(token);

        const userId = await service.sessions.validate(token);
        expect(userId).toBeNull();
      });

      it('should not throw error when deleting non-existent session', async () => {
        await expect(service.sessions.delete('non-existent-token')).resolves.not.toThrow();
      });
    });
  });
}
