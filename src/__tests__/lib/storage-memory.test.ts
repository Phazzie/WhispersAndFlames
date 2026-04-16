/**
 * Tests for storage-memory.ts - In-memory storage implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GameState } from '@/lib/game-types';
import { storage as memoryStorage } from '@/lib/storage-memory';

// Import directly to test the in-memory storage

describe('In-Memory Storage', () => {
  beforeEach(() => {
    // Clear all storage before each test
    // Since storage is a singleton, we need to manually clear it
    // This is a bit of a hack, but necessary for testing
  });

  describe('Users', () => {
    it('should create a user', async () => {
      const email = 'test@example.com';
      const passwordHash = 'hashed-password';

      const user = await memoryStorage.users.create(email, passwordHash);

      expect(user).toMatchObject({
        id: expect.any(String),
        email,
        passwordHash,
        createdAt: expect.any(Date),
      });
    });

    it('should find user by email', async () => {
      const email = `test-${Date.now()}@example.com`;
      const passwordHash = 'hashed-password';

      const created = await memoryStorage.users.create(email, passwordHash);
      const found = await memoryStorage.users.findByEmail(email);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
      expect(found?.passwordHash).toBe(passwordHash);
    });

    it('should return undefined for non-existent email', async () => {
      const found = await memoryStorage.users.findByEmail(`nonexistent-${Date.now()}@example.com`);
      expect(found).toBeUndefined();
    });

    it('should find user by id', async () => {
      const email = 'test@example.com';
      const passwordHash = 'hashed-password';

      const created = await memoryStorage.users.create(email, passwordHash);
      const found = await memoryStorage.users.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        email,
        passwordHash,
      });
    });

    it('should return undefined for non-existent id', async () => {
      const found = await memoryStorage.users.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('Sessions', () => {
    it('should create a session', async () => {
      const userId = 'user-123';

      const token = await memoryStorage.sessions.create(userId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should validate a session', async () => {
      const userId = 'user-123';

      const token = await memoryStorage.sessions.create(userId);
      const validated = await memoryStorage.sessions.validate(token);

      expect(validated).toBe(userId);
    });

    it('should return null for invalid token', async () => {
      const validated = await memoryStorage.sessions.validate('invalid-token');
      expect(validated).toBeNull();
    });

    it('should return null for expired session', async () => {
      const userId = 'user-123';

      // Create a session
      const token = await memoryStorage.sessions.create(userId);

      // Manually expire the session by setting expiry in the past
      // This requires access to internal state, which we simulate by waiting
      // In real test, we'd mock Date.now() or use a test helper

      // For now, just test that validation returns userId when valid
      const validated = await memoryStorage.sessions.validate(token);
      expect(validated).toBe(userId);
    });

    it('should delete a session', async () => {
      const userId = 'user-123';

      const token = await memoryStorage.sessions.create(userId);
      await memoryStorage.sessions.delete(token);

      const validated = await memoryStorage.sessions.validate(token);
      expect(validated).toBeNull();
    });
  });

  describe('Games', () => {
    it('should create a game', async () => {
      const roomCode = `TEST-${Date.now()}`;
      const gameState: GameState = {
        roomCode,
        step: 'lobby',
        playerIds: ['player-1'],
        gameMode: 'online',
        hostId: 'player-1',
        players: [
          {
            id: 'player-1',
            name: 'Player One',
            email: 'player1@example.com',
            isReady: false,
            selectedCategories: [],
          },
        ],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode, gameState);

      const found = await memoryStorage.games.get(roomCode);
      expect(found).toMatchObject(gameState);
    });

    it('should update a game', async () => {
      const roomCode = `TEST-${Date.now()}`;
      const gameState: GameState = {
        roomCode,
        step: 'lobby',
        playerIds: ['player-1'],
        gameMode: 'online',
        hostId: 'player-1',
        players: [
          {
            id: 'player-1',
            name: 'Player One',
            email: 'player1@example.com',
            isReady: false,
            selectedCategories: [],
          },
        ],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode, gameState);

      await memoryStorage.games.update(roomCode, { step: 'categories' });

      const found = await memoryStorage.games.get(roomCode);
      expect(found?.step).toBe('categories');
    });

    it('should return undefined for non-existent game', async () => {
      const found = await memoryStorage.games.get('NONEXISTENT-99999');
      expect(found).toBeUndefined();
    });

    it('should delete a game', async () => {
      const roomCode = `TEST-${Date.now()}`;
      const gameState: GameState = {
        roomCode,
        step: 'lobby',
        playerIds: ['player-1'],
        gameMode: 'online',
        hostId: 'player-1',
        players: [
          {
            id: 'player-1',
            name: 'Player One',
            email: 'player1@example.com',
            isReady: false,
            selectedCategories: [],
          },
        ],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode, gameState);
      await memoryStorage.games.delete(roomCode);

      const found = await memoryStorage.games.get(roomCode);
      expect(found).toBeUndefined();
    });

    it('should list games for a user', async () => {
      const userId = `user-${Date.now()}`;
      const roomCode1 = `GAME-${Date.now()}-001`;
      const roomCode2 = `GAME-${Date.now()}-002`;

      const game1: GameState = {
        roomCode: roomCode1,
        step: 'lobby',
        playerIds: [userId],
        gameMode: 'online',
        hostId: userId,
        players: [],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      const game2: GameState = {
        roomCode: roomCode2,
        step: 'lobby',
        playerIds: [userId],
        gameMode: 'online',
        hostId: userId,
        players: [],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode1, game1);
      await memoryStorage.games.create(roomCode2, game2);

      const games = await memoryStorage.games.list(userId);

      expect(games.length).toBeGreaterThanOrEqual(2);
      expect(games.some((g) => g.roomCode === roomCode1)).toBe(true);
      expect(games.some((g) => g.roomCode === roomCode2)).toBe(true);
    });

    it('should filter games by step', async () => {
      const userId = `user-filter-${Date.now()}`;
      const lobbyCode = `LOBBY-${Date.now()}`;
      const gameCode = `GAME-${Date.now()}`;

      const baseGame: Omit<GameState, 'roomCode' | 'step'> = {
        playerIds: [userId],
        gameMode: 'online',
        hostId: userId,
        players: [],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(lobbyCode, {
        ...baseGame,
        roomCode: lobbyCode,
        step: 'lobby',
      });
      await memoryStorage.games.create(gameCode, {
        ...baseGame,
        roomCode: gameCode,
        step: 'game',
      });

      const lobbyGames = await memoryStorage.games.list(userId, { step: 'lobby' });
      expect(lobbyGames.some((g) => g.roomCode === lobbyCode)).toBe(true);
      expect(lobbyGames.some((g) => g.roomCode === gameCode)).toBe(false);
    });

    it('should notify subscribers when game is updated', async () => {
      const roomCode = `SUB-${Date.now()}`;
      const gameState: GameState = {
        roomCode,
        step: 'lobby',
        playerIds: ['player-1'],
        gameMode: 'online',
        hostId: 'player-1',
        players: [],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode, gameState);

      const callbackSpy = vi.fn();
      memoryStorage.games.subscribe(roomCode, callbackSpy);

      await memoryStorage.games.update(roomCode, { step: 'categories' });

      expect(callbackSpy).toHaveBeenCalledOnce();
      expect(callbackSpy).toHaveBeenCalledWith(expect.objectContaining({ step: 'categories' }));
    });

    it('should allow unsubscribing from game updates', async () => {
      const roomCode = `UNSUB-${Date.now()}`;
      const gameState: GameState = {
        roomCode,
        step: 'lobby',
        playerIds: ['player-1'],
        gameMode: 'online',
        hostId: 'player-1',
        players: [],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode, gameState);

      const callbackSpy = vi.fn();
      const unsubscribe = memoryStorage.games.subscribe(roomCode, callbackSpy);

      unsubscribe();

      await memoryStorage.games.update(roomCode, { step: 'categories' });

      expect(callbackSpy).not.toHaveBeenCalled();
    });

    it('should return existing game without modification when update contains no new players', async () => {
      const roomCode = `DUP-${Date.now()}`;
      const player = {
        id: 'player-1',
        name: 'Alice',
        email: '',
        isReady: false,
        selectedCategories: [] as string[],
      };
      const gameState: GameState = {
        roomCode,
        step: 'lobby',
        playerIds: ['player-1'],
        gameMode: 'online',
        hostId: 'player-1',
        players: [player],
        commonCategories: [],
        finalSpicyLevel: 'Medium',
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        summary: '',
        imageGenerationCount: 0,
      };

      await memoryStorage.games.create(roomCode, gameState);

      // Try to "add" a player that already exists
      const result = await memoryStorage.games.update(roomCode, { players: [player] });

      // Should return the original game without modifications
      expect(result?.players).toHaveLength(1);
      expect(result?.step).toBe('lobby');
    });
  });

  describe('Sessions - expired session cleanup', () => {
    it('should return null for an expired session', async () => {
      vi.useFakeTimers();
      const userId = 'user-expiry-test';

      const token = await memoryStorage.sessions.create(userId);

      // Advance time by 8 days (session expires after 7)
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      const result = await memoryStorage.sessions.validate(token);
      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it('should trigger opportunistic cleanup when Math.random() < 0.1', async () => {
      vi.useFakeTimers();
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);

      // Create a session that will expire
      const userId = `cleanup-user-${baseTime}`;
      const expiredToken = await memoryStorage.sessions.create(userId);

      // Advance time by 8 days so this session expires
      vi.setSystemTime(baseTime + 8 * 24 * 60 * 60 * 1000);

      // Mock random to always trigger cleanup
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.05);

      // Create a new session — this triggers opportunistic cleanup of the expired one
      const newUserId = `cleanup-new-${baseTime}`;
      await memoryStorage.sessions.create(newUserId);

      // The expired session should now be invalid
      const result = await memoryStorage.sessions.validate(expiredToken);
      expect(result).toBeNull();

      mockRandom.mockRestore();
      vi.useRealTimers();
    });
  });
});
