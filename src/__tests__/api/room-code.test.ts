import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth before importing route
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}));

// Mock storage adapter
vi.mock('@/lib/storage-adapter', () => ({
  storage: {
    games: {
      get: vi.fn(),
    },
  },
}));

// Mock logger to suppress output in tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// NOTE: '@/lib/utils/rate-limiter' is deliberately NOT mocked here. This suite
// exercises the real limiter the route instantiates at module scope, so the 429
// case actually proves RATE_LIMIT_GAME_GET is enforced. That shared instance
// survives vi.clearAllMocks(), so each test uses its own client IP (the route
// keys the limiter on `game-get:${ip}`) to get an isolated counter.
import { auth } from '@clerk/nextjs/server';
import { RATE_LIMIT_GAME_GET } from '@/lib/api-constants';
import { storage } from '@/lib/storage-adapter';
import { GET } from '@/app/api/game/[roomCode]/route';
import type { GameState } from '@/lib/game-types';

const mockAuth = vi.mocked(auth);
const mockGamesGet = vi.mocked(storage.games.get);

function makeRequest(roomCode: string): Request {
  return new Request(`http://localhost/api/game/${roomCode}`, { method: 'GET' });
}

// The route's limiter is constructed at module scope, so its bucket Map
// survives vi.clearAllMocks() and leaks between tests. The key is
// `game-get:${userId}`, so each test authenticates as a different user to get
// an isolated counter. Deliberately NOT mocking the rate limiter itself —
// stubbing it would make the 429 assertions a test of a hand-fed return value.
function callRoute(roomCode: string, userId = 'test-user-id') {
  mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  return GET(makeRequest(roomCode), {
    params: Promise.resolve({ roomCode }),
  });
}

function asParticipant(userId: string) {
  mockGamesGet.mockResolvedValue(makeParticipantGame(userId));
}

// The route rejects a caller who is not in playerIds with 403, so the fixture
// is built around whichever user the test authenticates as.
const makeParticipantGame = (userId: string): GameState => ({
  step: 'lobby',
  players: [
    { id: userId, name: 'Alice', email: '', isReady: false, selectedCategories: [] },
    { id: 'other-user-id', name: 'Bob', email: '', isReady: false, selectedCategories: [] },
  ],
  playerIds: [userId, 'other-user-id'],
  hostId: userId,
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
  roomCode: 'ROOM01',
});

describe('GET /api/game/[roomCode]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockGamesGet.mockResolvedValue(makeParticipantGame('test-user-id'));
  });

  it('returns 200 with the game when the room code exists', async () => {
    asParticipant('user-exists');
    const response = await callRoute('ROOM01', 'user-exists');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('game');
    expect(body.game.roomCode).toBe('ROOM01');
    expect(mockGamesGet).toHaveBeenCalledWith('ROOM01');
  });

  it('returns 404 when the room code does not exist', async () => {
    mockGamesGet.mockResolvedValue(undefined);

    const response = await callRoute('NOPE01', 'user-missing');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('GAME_NOT_FOUND');
    expect(body.error.message).toBe('Room not found');
  });

  it('serves an authenticated request that is still under the rate limit', async () => {
    const rateLimitUser = 'user-under-limit';
    asParticipant(rateLimitUser);

    // Burn every request in the window except the last one.
    for (let i = 0; i < RATE_LIMIT_GAME_GET - 1; i++) {
      const warmup = await callRoute('ROOM01', rateLimitUser);
      expect(warmup.status).toBe(200);
    }

    // The final request inside the window must still be served normally.
    const response = await callRoute('ROOM01', rateLimitUser);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.roomCode).toBe('ROOM01');
    expect(response.headers.get('Retry-After')).toBeNull();
  });

  it('returns 429 once RATE_LIMIT_GAME_GET requests in the window are exceeded', async () => {
    const rateLimitUser = 'user-over-limit';
    asParticipant(rateLimitUser);

    // Exhaust the window: exactly RATE_LIMIT_GAME_GET requests are allowed.
    for (let i = 0; i < RATE_LIMIT_GAME_GET; i++) {
      const allowed = await callRoute('ROOM01', rateLimitUser);
      expect(allowed.status).toBe(200);
    }

    const response = await callRoute('ROOM01', rateLimitUser);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.error.message).toBe('Too many requests. Please slow down.');
    expect(response.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT_GAME_GET));
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});
