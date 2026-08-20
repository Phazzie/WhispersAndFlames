import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GAME_STATE_POLL_INTERVAL_MS, GAME_STATE_POLL_MAX_INTERVAL_MS } from '@/lib/api-constants';
import { clientGame } from '@/lib/client-game';
import type { GameState } from '@/lib/game-types';

const ROOM_CODE = 'ABC123';

/** Minimal but complete GameState, enough for the poll callback to hand back. */
const fakeGame: GameState = {
  step: 'lobby',
  players: [],
  playerIds: [],
  hostId: 'host-1',
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
  roomCode: ROOM_CODE,
};

type FetchMock = ReturnType<typeof vi.fn>;

let fetchMock: FetchMock;

/** A successful `/api/game/[roomCode]` response. */
function okResponse(game: GameState = fakeGame) {
  return {
    ok: true,
    json: async () => ({ game }),
  };
}

/**
 * Drains every pending microtask (and any timer already due) without moving
 * the fake clock forward. Vitest's async timer helpers hop out through a real
 * timer, so awaiting one flushes the whole promise chain inside `subscribe`.
 */
async function flushPending(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

/** The AbortSignal `subscribe` handed to fetch on its Nth (0-based) call. */
function signalOfCall(index: number): AbortSignal {
  const call = fetchMock.mock.calls[index] as [string, RequestInit];
  return call[1].signal as AbortSignal;
}

/**
 * Asserts the next poll fires exactly `expectedDelay` ms after the previous one
 * settled: nothing at `expectedDelay - 1`, one more fetch at `expectedDelay`.
 */
async function expectNextPollAfter(expectedDelay: number): Promise<void> {
  const before = fetchMock.mock.calls.length;

  await vi.advanceTimersByTimeAsync(expectedDelay - 1);
  expect(fetchMock).toHaveBeenCalledTimes(before);

  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock).toHaveBeenCalledTimes(before + 1);
}

describe('clientGame.subscribe poll backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // Failed polls log through the module logger; keep the output quiet.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('repeats healthy polls at the base interval', async () => {
    fetchMock.mockResolvedValue(okResponse());

    const callback = vi.fn();
    const subscription = clientGame.subscribe(ROOM_CODE, callback);

    // The first poll fires immediately, before any timer is scheduled.
    await flushPending();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/game/${ROOM_CODE}`,
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
    expect(callback).toHaveBeenCalledWith(fakeGame);

    // Every subsequent poll stays on the 2000ms cadence.
    await expectNextPollAfter(GAME_STATE_POLL_INTERVAL_MS);
    await expectNextPollAfter(GAME_STATE_POLL_INTERVAL_MS);
    await expectNextPollAfter(GAME_STATE_POLL_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(callback).toHaveBeenCalledTimes(4);

    subscription.unsubscribe();
  });

  it('doubles the delay on consecutive failures and caps it at the maximum', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const callback = vi.fn();
    const subscription = clientGame.subscribe(ROOM_CODE, callback);

    // The immediate first poll already fails, so it consumes the 2000ms base
    // and the first *observable* gap is the doubled 4000ms.
    await flushPending();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expectNextPollAfter(2 * GAME_STATE_POLL_INTERVAL_MS); // 4000
    await expectNextPollAfter(4 * GAME_STATE_POLL_INTERVAL_MS); // 8000
    await expectNextPollAfter(GAME_STATE_POLL_MAX_INTERVAL_MS); // 16000 -> capped 10000
    await expectNextPollAfter(GAME_STATE_POLL_MAX_INTERVAL_MS); // stays capped
    await expectNextPollAfter(GAME_STATE_POLL_MAX_INTERVAL_MS); // stays capped

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(callback).not.toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it('resets the delay to the base interval after a successful poll', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const callback = vi.fn();
    const subscription = clientGame.subscribe(ROOM_CODE, callback);

    await flushPending();
    await expectNextPollAfter(2 * GAME_STATE_POLL_INTERVAL_MS); // 4000
    await expectNextPollAfter(4 * GAME_STATE_POLL_INTERVAL_MS); // 8000, delay now 10000

    // The backend recovers: this poll succeeds and drops back to the base rate.
    fetchMock.mockResolvedValue(okResponse());
    await expectNextPollAfter(GAME_STATE_POLL_MAX_INTERVAL_MS);
    expect(callback).toHaveBeenCalledTimes(1);

    await expectNextPollAfter(GAME_STATE_POLL_INTERVAL_MS);
    await expectNextPollAfter(GAME_STATE_POLL_INTERVAL_MS);
    expect(callback).toHaveBeenCalledTimes(3);

    subscription.unsubscribe();
  });

  it('clears the pending timer and aborts the in-flight request on unsubscribe', async () => {
    // A settled poll leaves a timer queued for the next one.
    fetchMock.mockResolvedValue(okResponse());
    const settled = clientGame.subscribe(ROOM_CODE, vi.fn());

    await flushPending();
    expect(vi.getTimerCount()).toBe(1);

    settled.unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    expect(signalOfCall(0).aborted).toBe(true);

    // A poll still in flight is aborted rather than left hanging.
    fetchMock.mockReset();
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const inFlight = clientGame.subscribe(ROOM_CODE, vi.fn());

    await flushPending();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signalOfCall(0).aborted).toBe(false);

    inFlight.unsubscribe();
    expect(signalOfCall(0).aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start an overlapping request while one is still in flight', async () => {
    // This request never settles, so the self-rescheduling chain never queues
    // the next poll and no second request can overlap it.
    fetchMock.mockReturnValue(new Promise(() => undefined));

    const callback = vi.fn();
    const subscription = clientGame.subscribe(ROOM_CODE, callback);

    await flushPending();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * GAME_STATE_POLL_MAX_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    subscription.unsubscribe();
  });
});
