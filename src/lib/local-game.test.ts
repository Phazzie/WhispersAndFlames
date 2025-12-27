import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { localGame } from './local-game';
import type { GameState } from './game-types';

describe('localGame', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Clear mock storage
    for (const key in mockStorage) delete mockStorage[key];

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, value) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          for (const key in mockStorage) delete mockStorage[key];
        }),
        length: 0,
        key: vi.fn((index) => Object.keys(mockStorage)[index] || null),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a new game correctly', () => {
    const game = localGame.create(['Alice', 'Bob']);
    expect(game).toBeDefined();
    expect(game.players).toHaveLength(2);
    expect(game.roomCode).toBeDefined();
    expect(game.step).toBe('lobby');

    // Check storage
    expect(window.localStorage.setItem).toHaveBeenCalled();
    const storedGame = JSON.parse(mockStorage[`local-game:${game.roomCode}`]);
    expect(storedGame).toEqual(expect.objectContaining({
        roomCode: game.roomCode,
        hostId: game.players[0].id
    }));
  });

  it('retrieves an existing game', () => {
    const game = localGame.create(['Alice']);
    const retrieved = localGame.get(game.roomCode);
    expect(retrieved).toEqual(game);
  });

  it('updates a game correctly', () => {
    const game = localGame.create(['Alice']);
    const updated = localGame.update(game.roomCode, { step: 'categories' });
    expect(updated?.step).toBe('categories');

    const stored = localGame.get(game.roomCode);
    expect(stored?.step).toBe('categories');
  });

  it('handles invalid JSON in storage gracefully', () => {
    const roomCode = 'INVALID';
    mockStorage[`local-game:${roomCode}`] = '{ invalid json }';
    const game = localGame.get(roomCode);
    expect(game).toBeNull();
  });

  it('lists all local games', () => {
    const game1 = localGame.create(['A']);
    const game2 = localGame.create(['B']);

    // Mock key iteration
    Object.defineProperty(window.localStorage, 'length', {
        value: Object.keys(mockStorage).length
    });

    const games = localGame.listAll();

    expect(games.length).toBeGreaterThanOrEqual(2);
    expect(games.find(g => g.roomCode === game1.roomCode)).toBeDefined();
    expect(games.find(g => g.roomCode === game2.roomCode)).toBeDefined();
  });

  it('handles concurrent updates (simulated) correctly', () => {
    const game = localGame.create(['Alice']);
    const roomCode = game.roomCode;

    // Simulate Tab A update
    localGame.update(roomCode, { currentQuestion: 'Question 1' });

    // Simulate Tab B update (which should fetch the latest state including Question 1)
    // We update a different field
    const finalState = localGame.update(roomCode, { chaosMode: true });

    expect(finalState?.currentQuestion).toBe('Question 1');
    expect(finalState?.chaosMode).toBe(true);
    expect(finalState?.version).toBe(3); // Initial (1) + Update 1 (2) + Update 2 (3)
  });

  it('handles QuotaExceededError gracefully', () => {
    const game = localGame.create(['Alice']);

    // Mock setItem to throw QuotaExceededError
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = vi.fn(() => {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Try to update
    const result = localGame.update(game.roomCode, { summary: 'Large summary' });

    // It should return the updated state object even if persistence failed
    expect(result?.summary).toBe('Large summary');

    // Restore
    window.localStorage.setItem = originalSetItem;
    consoleSpy.mockRestore();
  });
});
