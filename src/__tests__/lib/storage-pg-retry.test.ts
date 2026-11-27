/**
 * The pg backend's update() runs inside withRetry, so its closure can execute
 * more than once. These tests pin the invariant that each attempt starts from
 * the ORIGINAL request rather than from the previous attempt's merged output.
 *
 * `pg` is mocked because storage-pg constructs a Pool at module load.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameState, Player } from '@/lib/game-types';

type Handler = (sql: string, params?: unknown[]) => unknown;

const state: { rows: GameState[]; written: GameState[]; commitFailuresLeft: number } = {
  rows: [],
  written: [],
  commitFailuresLeft: 0,
};

const query: Handler = (sql) => {
  if (sql.startsWith('SELECT state FROM games')) {
    return { rows: [{ state: state.rows[Math.min(state.written.length, state.rows.length - 1)] }] };
  }
  if (sql.startsWith('UPDATE games SET state')) {
    return {};
  }
  if (sql === 'COMMIT') {
    if (state.commitFailuresLeft > 0) {
      state.commitFailuresLeft -= 1;
      // Neutral message so withRetry's default predicate retries it.
      throw new Error('connection reset by peer');
    }
    return {};
  }
  return {};
};

vi.mock('pg', () => {
  class Pool {
    on() {}
    async connect() {
      return {
        query: vi.fn(async (sql: string, params?: unknown[]) => {
          if (sql.startsWith('UPDATE games SET state')) {
            state.written.push(JSON.parse(String(params?.[0])) as GameState);
            return {};
          }
          return query(sql, params);
        }),
        release: vi.fn(),
      };
    }
  }
  return { Pool };
});

function player(id: string, name: string, isReady: boolean): Player {
  return { id, name, isReady } as Player;
}

function game(players: Player[]): GameState {
  return { roomCode: 'ABC123', players, playerIds: players.map((p) => p.id) } as GameState;
}

describe('storage-pg update() under retry', () => {
  beforeEach(() => {
    state.rows = [];
    state.written = [];
    state.commitFailuresLeft = 0;
    vi.resetModules();
  });

  it('merges each attempt against the original request, not the previous attempt', async () => {
    // Attempt 1 locks a row where P1 is not ready. The partner readies up
    // before the retry, so attempt 2 locks a row where P1 is ready.
    state.rows = [
      game([player('p1', 'Alice', false), player('p2', 'Bob', false)]),
      game([player('p1', 'Alice', true), player('p2', 'Bob', false)]),
    ];
    state.commitFailuresLeft = 1;

    const { storage } = await import('@/lib/storage-pg');

    // The caller only ever proposed their own entry.
    const requested = { players: [player('p2', 'Bob', true)] };
    const result = await storage.games.update('ABC123', requested);

    expect(state.written).toHaveLength(2);

    const persisted = state.written[1].players;
    const p1 = persisted.find((p) => p.id === 'p1');
    const p2 = persisted.find((p) => p.id === 'p2');

    // The partner's readiness, written between the two attempts, survives.
    // Before the fix, attempt 2 re-merged attempt 1's output, which carried
    // the stale isReady:false snapshot and clobbered it.
    expect(p1?.isReady).toBe(true);
    expect(p2?.isReady).toBe(true);
    expect(result?.players).toHaveLength(2);
  });

  it('does not mutate the updates object the caller passed in', async () => {
    state.rows = [game([player('p1', 'Alice', false), player('p2', 'Bob', false)])];

    const { storage } = await import('@/lib/storage-pg');

    const requested = { players: [player('p2', 'Bob', true)], playerIds: ['p2'] };
    await storage.games.update('ABC123', requested);

    expect(requested.players).toHaveLength(1);
    expect(requested.players[0].id).toBe('p2');
    expect(requested.playerIds).toEqual(['p2']);
  });
});
