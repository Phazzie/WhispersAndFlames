/**
 * Integration test for the two-player game flow.
 *
 * Unlike every other API test in this suite, this file deliberately does NOT
 * mock `@/lib/storage-adapter`. With no `DATABASE_URL` set (vitest.setup.ts
 * never defines one), the adapter selects the real in-memory backend, so both
 * simulated players read and write the same module-level Map. That is the whole
 * point: it proves state is genuinely shared between two players rather than
 * fabricated per request by a mock.
 *
 * Only `@clerk/nextjs/server` is mocked — switching which player is "signed in"
 * is done by changing what the mocked `auth()` resolves to, exactly as
 * `update.test.ts` does.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock Clerk auth before importing routes. This is the ONLY mock in this file.
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/game/[roomCode]/route';
import { POST as createGame } from '@/app/api/game/create/route';
import { POST as joinGame } from '@/app/api/game/join/route';
import { POST as updateGame } from '@/app/api/game/update/route';
import { generateRoomCode } from '@/lib/game-utils';
import { storage } from '@/lib/storage-adapter';
import { storage as memoryStorage } from '@/lib/storage-memory';

const mockAuth = vi.mocked(auth);

const PLAYER_A_ID = 'user_player_a';
const PLAYER_B_ID = 'user_player_b';

/** Make the mocked Clerk session resolve to a given player. */
function signInAs(userId: string): void {
  mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
}

function makePostRequest(path: string, body: unknown): Request {
  const json = JSON.stringify(body);
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(json.length),
    },
    body: json,
  });
}

function makeGetRequest(roomCode: string): Request {
  return new Request(`http://localhost/api/game/${roomCode}`, { method: 'GET' });
}

/** The GET route receives its dynamic segment as a promise (Next 15 convention). */
function routeParams(roomCode: string): { params: Promise<{ roomCode: string }> } {
  return { params: Promise.resolve({ roomCode }) };
}

describe('two-player game flow (real in-memory storage)', () => {
  // Shared across the sequential steps below.
  let roomCode = '';

  beforeAll(() => {
    // Guard the premise of this test: no DATABASE_URL means the storage adapter
    // must have selected the in-memory backend, so the routes and this test file
    // are talking to the same store.
    expect(process.env.DATABASE_URL).toBeFalsy();
    expect(storage).toBe(memoryStorage);
  });

  it('player A creates a game and becomes the only player', async () => {
    signInAs(PLAYER_A_ID);

    const requestedRoomCode = generateRoomCode();
    const response = await createGame(
      makePostRequest('/api/game/create', {
        roomCode: requestedRoomCode,
        playerName: 'Alice',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.game.roomCode).toBe(requestedRoomCode);
    expect(body.game.step).toBe('lobby');
    expect(body.game.hostId).toBe(PLAYER_A_ID);
    expect(body.game.players).toHaveLength(1);
    expect(body.game.players[0]).toMatchObject({ id: PLAYER_A_ID, name: 'Alice' });
    expect(body.game.playerIds).toEqual([PLAYER_A_ID]);

    // Share the room code with the remaining steps.
    roomCode = body.game.roomCode;
  });

  it('player B joins that room and the response shows both players', async () => {
    signInAs(PLAYER_B_ID);

    const response = await joinGame(
      makePostRequest('/api/game/join', {
        roomCode,
        playerName: 'Bob',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.players).toHaveLength(2);
    expect(body.game.players.map((p: { id: string }) => p.id)).toEqual([PLAYER_A_ID, PLAYER_B_ID]);
    expect(body.game.players[1]).toMatchObject({ id: PLAYER_B_ID, name: 'Bob' });
    expect(body.game.playerIds).toEqual([PLAYER_A_ID, PLAYER_B_ID]);
    // Host is unchanged by a join.
    expect(body.game.hostId).toBe(PLAYER_A_ID);
  });

  it('player A fetches the room and sees player B (state is shared, not per-request)', async () => {
    signInAs(PLAYER_A_ID);

    const response = await GET(makeGetRequest(roomCode), routeParams(roomCode));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.roomCode).toBe(roomCode);
    expect(body.game.playerIds).toEqual([PLAYER_A_ID, PLAYER_B_ID]);
    expect(body.game.players.map((p: { name: string }) => p.name)).toEqual(['Alice', 'Bob']);
  });

  it('player A advances the game and the update persists', async () => {
    signInAs(PLAYER_A_ID);

    const response = await updateGame(
      makePostRequest('/api/game/update', {
        roomCode,
        updates: {
          step: 'spicy',
          commonCategories: ['Hidden Attractions', 'Power Play'],
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.step).toBe('spicy');
    expect(body.game.commonCategories).toEqual(['Hidden Attractions', 'Power Play']);
    // Updating must not disturb the roster.
    expect(body.game.playerIds).toEqual([PLAYER_A_ID, PLAYER_B_ID]);
    expect(body.game.players).toHaveLength(2);
  });

  it("player B fetches the room and observes player A's update", async () => {
    signInAs(PLAYER_B_ID);

    const response = await GET(makeGetRequest(roomCode), routeParams(roomCode));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.step).toBe('spicy');
    expect(body.game.commonCategories).toEqual(['Hidden Attractions', 'Power Play']);
    expect(body.game.players.map((p: { name: string }) => p.name)).toEqual(['Alice', 'Bob']);
  });
});
