/**
 * Tests for storage adapter configuration
 * Verifies that DISABLE_DATABASE flag properly controls storage backend selection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const createGameState = (roomCode: string) => ({
  step: 'lobby' as const,
  players: [],
  playerIds: [],
  hostId: 'host-1',
  gameMode: 'online' as const,
  commonCategories: [],
  finalSpicyLevel: 'Mild' as const,
  chaosMode: false,
  gameRounds: [],
  currentQuestion: '',
  currentQuestionIndex: 0,
  totalQuestions: 10,
  summary: '',
  imageGenerationCount: 0,
  roomCode,
});

describe('Storage Adapter Configuration', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules before each test to get fresh import
    vi.resetModules();
    // Create a fresh copy of process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should use in-memory storage when DATABASE_URL is not set', async () => {
    // Arrange
    delete process.env.DATABASE_URL;
    delete process.env.DISABLE_DATABASE;

    // Act - dynamically import to get fresh module
    const { storage } = await import('@/lib/storage-adapter');

    // Assert - in-memory storage methods are synchronous
    const result = storage.games.create('ROOM1', createGameState('ROOM1'));
    expect(result).toBeDefined();
    expect(result.roomCode).toBe('ROOM1');
    // Synchronous methods don't return promises
    expect(result).not.toBeInstanceOf(Promise);
  });

  it('should use in-memory storage when DISABLE_DATABASE is true', async () => {
    // Arrange
    process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';
    process.env.DISABLE_DATABASE = 'true';

    // Act - dynamically import to get fresh module
    const { storage } = await import('@/lib/storage-adapter');

    // Assert - in-memory storage methods are synchronous
    const result = storage.games.create('ROOM2', createGameState('ROOM2'));
    expect(result).toBeDefined();
    expect(result.roomCode).toBe('ROOM2');
    // Synchronous methods don't return promises
    expect(result).not.toBeInstanceOf(Promise);
  });

  it('should use in-memory storage when DISABLE_DATABASE is false and DATABASE_URL is not set', async () => {
    // Arrange
    delete process.env.DATABASE_URL;
    process.env.DISABLE_DATABASE = 'false';

    // Act - dynamically import to get fresh module
    const { storage } = await import('@/lib/storage-adapter');

    // Assert - in-memory storage methods are synchronous
    const result = storage.games.create('ROOM3', createGameState('ROOM3'));
    expect(result).toBeDefined();
    expect(result.roomCode).toBe('ROOM3');
    // Synchronous methods don't return promises
    expect(result).not.toBeInstanceOf(Promise);
  });

  it('should prioritize DISABLE_DATABASE over DATABASE_URL', async () => {
    // Arrange - Both DATABASE_URL and DISABLE_DATABASE are set
    process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';
    process.env.DISABLE_DATABASE = 'true';

    // Act - dynamically import to get fresh module
    const { storage } = await import('@/lib/storage-adapter');

    // Assert - Should use in-memory (synchronous) not postgres (async)
    const result = storage.games.create('ROOM4', createGameState('ROOM4'));
    expect(result).toBeDefined();
    // Synchronous result means in-memory storage is being used
    expect(result).not.toBeInstanceOf(Promise);
  });
});
