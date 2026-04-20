import { describe, expect, it } from 'vitest';

import { storage as memoryStorage } from '@/lib/storage-memory';
import type { GameState } from '@/lib/game-types';

function createGame(roomCode: string, playerId = 'u1'): GameState {
  return {
    step: 'lobby',
    players: [
      {
        id: playerId,
        name: 'Player One',
        isReady: false,
        email: '',
        selectedCategories: [],
      },
    ],
    playerIds: [playerId],
    hostId: playerId,
    gameMode: 'online',
    commonCategories: [],
    finalSpicyLevel: 'Mild',
    chaosMode: false,
    gameRounds: [],
    currentQuestion: '',
    currentQuestionIndex: 0,
    totalQuestions: 0,
    summary: '',
    visualMemories: [],
    imageGenerationCount: 0,
    roomCode,
  };
}

describe('storage-memory games', () => {
  it('creates and gets a game', () => {
    const roomCode = `ROOM-${Date.now()}`;
    const game = createGame(roomCode);

    memoryStorage.games.create(roomCode, game);
    const found = memoryStorage.games.get(roomCode);

    expect(found).toBeDefined();
    expect(found?.roomCode).toBe(roomCode);
  });

  it('updates a game', () => {
    const roomCode = `ROOM-${Date.now()}-UPD`;
    const game = createGame(roomCode);
    memoryStorage.games.create(roomCode, game);

    const updated = memoryStorage.games.update(roomCode, { step: 'categories' });
    expect(updated?.step).toBe('categories');
  });

  it('updates existing players even when no new player ids are introduced', () => {
    const roomCode = `ROOM-${Date.now()}-PLAYERS-UPD`;
    const game = createGame(roomCode);
    memoryStorage.games.create(roomCode, game);

    const updated = memoryStorage.games.update(roomCode, {
      players: [
        {
          ...game.players[0],
          isReady: true,
          selectedCategories: ['Hidden Attractions'],
        },
      ],
    });

    expect(updated?.players[0].isReady).toBe(true);
    expect(updated?.players[0].selectedCategories).toEqual(['Hidden Attractions']);
  });

  it('merges players without dropping existing player ids', () => {
    const roomCode = `ROOM-${Date.now()}-PLAYER-MERGE`;
    const game = createGame(roomCode);
    memoryStorage.games.create(roomCode, game);

    const updated = memoryStorage.games.update(roomCode, {
      players: [
        ...game.players,
        {
          id: 'u2',
          name: 'Player Two',
          isReady: false,
          email: '',
          selectedCategories: [],
        },
      ],
      playerIds: ['u1', 'u2'],
    });

    expect(updated?.players).toHaveLength(2);
    expect(updated?.playerIds).toEqual(['u1', 'u2']);
  });

  it('lists games by player id', () => {
    const playerId = `user-${Date.now()}`;
    const roomCode = `ROOM-${Date.now()}-LIST`;
    memoryStorage.games.create(roomCode, createGame(roomCode, playerId));

    const games = memoryStorage.games.list(playerId);
    expect(games.some((g) => g.roomCode === roomCode)).toBe(true);
  });

  it('deletes a game', () => {
    const roomCode = `ROOM-${Date.now()}-DEL`;
    memoryStorage.games.create(roomCode, createGame(roomCode));

    memoryStorage.games.delete(roomCode);
    expect(memoryStorage.games.get(roomCode)).toBeUndefined();
  });

  it('subscribes and unsubscribes', () => {
    const roomCode = `ROOM-${Date.now()}-SUB`;
    const initial = createGame(roomCode);
    memoryStorage.games.create(roomCode, initial);

    let receivedStep: string | null = null;
    const unsubscribe = memoryStorage.games.subscribe(roomCode, (state) => {
      receivedStep = state.step;
    });

    memoryStorage.games.update(roomCode, { step: 'categories' });
    expect(receivedStep).toBe('categories');

    unsubscribe();
    memoryStorage.games.update(roomCode, { step: 'spicy' });
    expect(receivedStep).toBe('categories');
  });
});
