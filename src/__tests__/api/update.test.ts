import { describe, it, expect, vi, beforeEach } from 'vitest';
const { mockRateLimitCheck } = vi.hoisted(() => ({
  mockRateLimitCheck: vi.fn(),
}));

// Mock Clerk auth before importing route
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}));

// Mock storage adapter
vi.mock('@/lib/storage-adapter', () => ({
  storage: {
    games: {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock rate limiter utilities to control rate limiting
vi.mock('@/lib/utils/rate-limiter', () => ({
  getRateLimitIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
  RateLimiter: class {
    check = mockRateLimitCheck;
  },
}));

// Mock security utilities
vi.mock('@/lib/utils/security', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
  truncateInput: vi.fn((s: string) => s),
}));

// Mock logger to suppress output in tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { auth } from '@clerk/nextjs/server';
import { storage } from '@/lib/storage-adapter';
import { sanitizeHtml } from '@/lib/utils/security';
import { POST } from '@/app/api/game/update/route';
import type { GameState } from '@/lib/game-types';
import { GameUpdateRefusedError } from '@/lib/game-authorization';

const mockAuth = vi.mocked(auth);
const mockGamesGet = vi.mocked(storage.games.get);
const mockGamesUpdate = vi.mocked(storage.games.update);

function makeRequest(body: unknown): Request {
  const json = JSON.stringify(body);
  return new Request('http://localhost/api/game/update', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(json.length),
    },
    body: json,
  });
}

const participantGame: GameState = {
  step: 'lobby',
  players: [
    { id: 'test-user-id', name: 'Alice', email: '', isReady: false, selectedCategories: [] },
    { id: 'other-user-id', name: 'Bob', email: '', isReady: false, selectedCategories: [] },
  ],
  playerIds: ['test-user-id', 'other-user-id'],
  hostId: 'test-user-id',
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
  roomCode: 'ROOM-01',
};

const updatedGame: GameState = {
  ...participantGame,
  step: 'categories',
};

/** What the reconcile step actually authorized — the values that reach storage. */
let persistedUpdates: Partial<GameState> | undefined;

/** The stored row both storage mocks read, so a test can set it once. */
let storedGame: GameState;

describe('POST /api/game/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistedUpdates = undefined;
    storedGame = participantGame;
    // Restore defaults
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockRateLimitCheck.mockReturnValue({ allowed: true });
    mockGamesGet.mockResolvedValue(participantGame);
    // Authorization now runs inside storage.games.update, under its write lock.
    // The mock has to run the reconcile callback or these tests would exercise
    // a route that never authorizes anything.
    mockGamesUpdate.mockImplementation((_roomCode, updates, reconcile) => {
      let effective = updates as Partial<GameState>;
      if (reconcile) {
        const decision = reconcile(storedGame);
        if (!decision.ok) throw new GameUpdateRefusedError(decision.reason);
        effective = decision.updates;
      }
      persistedUpdates = effective;
      return { ...storedGame, ...effective };
    });
  });

  it('returns 200 with updated game when participant makes a valid update', async () => {
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('game');
    expect(mockGamesUpdate).toHaveBeenCalledOnce();
  });

  it('returns 403 when non-participant tries to update', async () => {
    // User is not in the game
    mockAuth.mockResolvedValue({ userId: 'stranger-user-id' } as Awaited<ReturnType<typeof auth>>);

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when updates object contains an unknown field (strict schema)', async () => {
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { unknownField: 'some-value' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when roomCode is missing', async () => {
    const request = makeRequest({
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when step value is not a valid enum', async () => {
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'invalid-step' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when game is not found', async () => {
    mockGamesGet.mockResolvedValue(undefined);

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('GAME_NOT_FOUND');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimitCheck.mockReturnValue({
      allowed: false,
      retryAfter: 12,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 12000,
    });

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers.get('Retry-After')).toBe('12');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('returns 413 when request body is too large', async () => {
    const request = new Request('http://localhost/api/game/update', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2000000', // 2MB - exceeds 1MB limit
      },
      body: JSON.stringify({ roomCode: 'ROOM-01', updates: { step: 'categories' } }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('allows updating multiple valid fields at once', async () => {
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: {
        step: 'game',
        chaosMode: true,
        finalSpicyLevel: 'Hot',
        currentQuestionIndex: 1,
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(persistedUpdates).toMatchObject({
      step: 'game',
      chaosMode: true,
      finalSpicyLevel: 'Hot',
      currentQuestionIndex: 1,
    });
  });

  it('accepts the end-of-game write that persists the summary', async () => {
    // Regression: completedAt was missing from this strict schema while
    // game-step.tsx sent it with the summary, so every completed game got a
    // 400 and lost its summary — the payoff moment of the whole product.
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: {
        summary: 'You both lit up talking about the same thing.',
        completedAt: new Date().toISOString(),
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(persistedUpdates).toMatchObject({
      summary: 'You both lit up talking about the same thing.',
    });
  });

  it('rejects a non-ISO completedAt', async () => {
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { completedAt: 'last tuesday' },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects hostId and playerIds outright — they are not update fields', async () => {
    // Membership and host are set by create/join. Keeping them out of the
    // schema makes escalation unrepresentable before authorization even runs.
    for (const updates of [{ hostId: 'other-user-id' }, { playerIds: ['mallory-id'] }]) {
      mockGamesUpdate.mockClear();
      const response = await POST(makeRequest({ roomCode: 'ROOM-01', updates }));
      expect(response.status).toBe(400);
      expect(mockGamesUpdate).not.toHaveBeenCalled();
    }
  });

  it("returns 403 when a participant writes their partner's answer", async () => {
    // The vulnerability this route previously had: being in the game was taken
    // as permission to write every field of it, including the other player's
    // answers — which then fed the AI summary and therapist notes.
    storedGame = {
      ...participantGame,
      gameRounds: [
        { question: 'What is love?', answers: { 'other-user-id': 'their real answer' } },
      ],
    };
    mockGamesGet.mockResolvedValue(storedGame);

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: {
        gameRounds: [
          { question: 'What is love?', answers: { 'other-user-id': 'a forged answer' } },
        ],
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    // update() is now where authorization happens, so it is called — the point
    // is that it refuses under the write lock and persists nothing.
    expect(persistedUpdates).toBeUndefined();
  });

  it('refuses to let a participant grant a stranger read access', async () => {
    // playerIds gates GET /api/game/[roomCode], and both storage backends union
    // it, so an accepted id would be permanent read access to every answer.
    // Two layers refuse it: the strict schema no longer names the field (400),
    // and authorizeGameUpdate would reject it anyway if the schema ever changed.
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { playerIds: ['test-user-id', 'other-user-id', 'mallory-id'] },
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockGamesUpdate).not.toHaveBeenCalled();
  });

  it('sanitizes gameRounds answers before persisting', async () => {
    const mockSanitizeHtml = vi.mocked(sanitizeHtml);
    // Make sanitizeHtml return a distinguishable sanitized value
    mockSanitizeHtml.mockImplementation((s: string) => `SANITIZED:${s}`);

    // The partner's answer is already stored. The client posts the whole
    // rounds array, so it echoes that answer back unchanged alongside its own
    // — the normal read-modify-write submit path. Field-level authorization
    // permits the echo and takes the partner's value from storage; writing a
    // *different* value there is covered in game-authorization.test.ts.
    storedGame = {
      ...participantGame,
      gameRounds: [{ question: 'What is love?', answers: { 'other-user-id': 'Plain answer' } }],
    };
    mockGamesGet.mockResolvedValue(storedGame);

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: {
        gameRounds: [
          {
            question: 'What is love?',
            answers: {
              'test-user-id': 'Baby <script>alert(1)</script> do not hurt me',
              'other-user-id': 'Plain answer',
            },
          },
        ],
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    // sanitizeHtml must have been called for each answer
    expect(mockSanitizeHtml).toHaveBeenCalledWith(
      expect.stringContaining('Baby <script>alert(1)</script>')
    );
    expect(mockSanitizeHtml).toHaveBeenCalledWith('Plain answer');
    // The sanitized answers should be what actually reaches storage
    expect(persistedUpdates).toMatchObject({
      gameRounds: expect.arrayContaining([
        expect.objectContaining({
          answers: expect.objectContaining({
            'test-user-id': expect.stringContaining('SANITIZED:'),
            'other-user-id': expect.stringContaining('SANITIZED:'),
          }),
        }),
      ]),
    });

    // Restore the pass-through mock for other tests
    mockSanitizeHtml.mockImplementation((s: string) => s);
  });

  it('handles gameRounds with rounds missing answers gracefully', async () => {
    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: {
        gameRounds: [
          {
            question: 'Q1',
            // no answers field
          },
        ],
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockGamesUpdate).toHaveBeenCalledOnce();
  });

  it('returns 500 when storage.games.update throws', async () => {
    mockGamesUpdate.mockRejectedValue(new Error('DB connection lost'));

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
