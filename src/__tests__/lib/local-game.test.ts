import { describe, it, expect, beforeEach } from 'vitest';

import type { GameState, Player } from '@/lib/game-types';
import { localGame } from '@/lib/local-game';

/**
 * Builds a minimal local-mode GameState in memory (no localStorage writes),
 * for exercising the pure helpers `nextPlayer` / `getCurrentPlayer`.
 */
function makeLocalState(overrides: Partial<GameState> = {}): GameState {
  const players: Player[] = [
    {
      id: 'local-player-1',
      name: 'Ada',
      email: 'player1@local',
      isReady: false,
      selectedCategories: [],
    },
    {
      id: 'local-player-2',
      name: 'Grace',
      email: 'player2@local',
      isReady: false,
      selectedCategories: [],
    },
    {
      id: 'local-player-3',
      name: 'Alan',
      email: 'player3@local',
      isReady: false,
      selectedCategories: [],
    },
  ];

  return {
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
    roomCode: 'LION-TIGER-BEAR-42',
    ...overrides,
  };
}

describe('localGame', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create', () => {
    it('returns a game whose players match the supplied names and is retrievable by room code', () => {
      const game = localGame.create(['Ada', 'Grace']);

      expect(game.players.map((p) => p.name)).toEqual(['Ada', 'Grace']);
      expect(game.players.map((p) => p.id)).toEqual(['local-player-1', 'local-player-2']);
      expect(game.gameMode).toBe('local');
      expect(game.hostId).toBe('local-player-1');
      expect(game.step).toBe('lobby');
      expect(game.roomCode).toBeTruthy();

      const fetched = localGame.get(game.roomCode);
      expect(fetched).not.toBeNull();
      expect(fetched?.roomCode).toBe(game.roomCode);
      expect(fetched?.players.map((p) => p.name)).toEqual(['Ada', 'Grace']);
    });

    it('trims names and falls back to a positional placeholder for blank names', () => {
      const game = localGame.create(['  Ada  ', '   ']);

      expect(game.players[0].name).toBe('Ada');
      expect(game.players[1].name).toBe('Player 2');
    });

    it('throws when given fewer than 1 or more than 3 player names', () => {
      expect(() => localGame.create([])).toThrow('Local games must have 1-3 players');
      expect(() => localGame.create(['A', 'B', 'C', 'D'])).toThrow(
        'Local games must have 1-3 players'
      );
    });

    it('marks the newly created game as the active one, retrievable via getCurrent', () => {
      const game = localGame.create(['Ada']);

      const current = localGame.getCurrent();
      expect(current?.roomCode).toBe(game.roomCode);
    });

    it('serializes createdAt to a string in storage even though the returned object holds a Date', () => {
      const game = localGame.create(['Ada']);

      expect(game.createdAt).toBeInstanceOf(Date);
      // Storage round-trips through JSON, so the persisted value is an ISO string.
      expect(typeof localGame.get(game.roomCode)?.createdAt).toBe('string');
    });
  });

  describe('getCurrent', () => {
    it('returns null when no game has been created', () => {
      expect(localGame.getCurrent()).toBeNull();
    });
  });

  describe('get', () => {
    it('returns null for a room code that was never created', () => {
      expect(localGame.get('NOPE-NOPE-NOPE-99')).toBeNull();
    });
  });

  describe('update', () => {
    it('applies a partial change, returns the updated state, and persists it', () => {
      const game = localGame.create(['Ada', 'Grace']);

      const updated = localGame.update(game.roomCode, {
        step: 'categories',
        finalSpicyLevel: 'Hot',
        commonCategories: ['Hidden Attractions'],
      });

      expect(updated).not.toBeNull();
      expect(updated?.step).toBe('categories');
      expect(updated?.finalSpicyLevel).toBe('Hot');
      expect(updated?.commonCategories).toEqual(['Hidden Attractions']);
      // Untouched fields survive the merge.
      expect(updated?.players.map((p) => p.name)).toEqual(['Ada', 'Grace']);

      const reread = localGame.get(game.roomCode);
      expect(reread?.step).toBe('categories');
      expect(reread?.finalSpicyLevel).toBe('Hot');
      expect(reread?.commonCategories).toEqual(['Hidden Attractions']);
    });

    it('returns null for an unknown room code', () => {
      expect(localGame.update('NOPE-NOPE-NOPE-99', { step: 'summary' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the game so a later get returns null', () => {
      const game = localGame.create(['Ada']);
      expect(localGame.get(game.roomCode)).not.toBeNull();

      localGame.delete(game.roomCode);

      expect(localGame.get(game.roomCode)).toBeNull();
    });

    it('clears the active-game pointer when the deleted game was the active one', () => {
      const game = localGame.create(['Ada']);

      localGame.delete(game.roomCode);

      expect(localGame.getCurrent()).toBeNull();
    });
  });

  describe('listAll', () => {
    it('returns an empty array when no games exist', () => {
      expect(localGame.listAll()).toEqual([]);
    });

    it('returns every created game', () => {
      const first = localGame.create(['Ada']);
      const second = localGame.create(['Grace', 'Alan']);

      const all = localGame.listAll();

      expect(all).toHaveLength(2);
      expect(all.map((g) => g.roomCode).sort()).toEqual([first.roomCode, second.roomCode].sort());
    });

    it('skips entries whose stored JSON is corrupt', () => {
      const game = localGame.create(['Ada']);
      localStorage.setItem('local-game:BROKEN-BROKEN-BROKEN-11', '{not json');

      const all = localGame.listAll();

      expect(all).toHaveLength(1);
      expect(all[0].roomCode).toBe(game.roomCode);
    });
  });

  describe('nextPlayer', () => {
    it('advances the current player index', () => {
      const state = makeLocalState({ currentPlayerIndex: 0 });

      const next = localGame.nextPlayer(state);

      expect(next.currentPlayerIndex).toBe(1);
      // Returns a new object rather than mutating the input.
      expect(state.currentPlayerIndex).toBe(0);
    });

    it('wraps from the last player back to the first', () => {
      const state = makeLocalState({ currentPlayerIndex: 2 });

      expect(localGame.nextPlayer(state).currentPlayerIndex).toBe(0);
    });

    it('throws when the game is not in local mode', () => {
      const state = makeLocalState({ gameMode: 'online' });

      expect(() => localGame.nextPlayer(state)).toThrow('nextPlayer can only be used in local mode');
    });
  });

  describe('getCurrentPlayer', () => {
    it('returns the player at the current index', () => {
      const state = makeLocalState({ currentPlayerIndex: 1 });

      expect(localGame.getCurrentPlayer(state)?.name).toBe('Grace');
    });

    it('treats a missing currentPlayerIndex as the first player', () => {
      const state = makeLocalState({ currentPlayerIndex: undefined });

      expect(localGame.getCurrentPlayer(state)?.name).toBe('Ada');
    });

    it('returns null when the current index is out of range', () => {
      const state = makeLocalState({ currentPlayerIndex: 99 });

      expect(localGame.getCurrentPlayer(state)).toBeNull();
    });

    it('returns null when the game is not in local mode', () => {
      const state = makeLocalState({ gameMode: 'online' });

      expect(localGame.getCurrentPlayer(state)).toBeNull();
    });
  });
});
