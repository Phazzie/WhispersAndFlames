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

function makeRequest(roomCode: string, clientIp: string): Request {
  return new Request(`http://localhost/api/game/${roomCode}`, {
    method: 'GET',
    headers: {
      'x-forwarded-for': clientIp,
    },
  });
}

function callRoute(roomCode: string, clientIp: string) {
  return GET(makeRequest(roomCode, clientIp), {
    params: Promise.resolve({ roomCode }),
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
  roomCode: 'ROOM01',
};

describe('GET /api/game/[roomCode]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockGamesGet.mockResolvedValue(participantGame);
  });

  it('returns 200 with the game when the room code exists', async () => {
    const response = await callRoute('ROOM01', '10.0.0.1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('game');
    expect(body.game.roomCode).toBe('ROOM01');
    expect(mockGamesGet).toHaveBeenCalledWith('ROOM01');
  });

  it('returns 404 when the room code does not exist', async () => {
    mockGamesGet.mockResolvedValue(undefined);

    const response = await callRoute('NOPE01', '10.0.0.2');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('GAME_NOT_FOUND');
    expect(body.error.message).toBe('Room not found');
  });

  it('serves an authenticated request that is still under the rate limit', async () => {
    const clientIp = '10.0.0.3';

    // Burn every request in the window except the last one.
    for (let i = 0; i < RATE_LIMIT_GAME_GET - 1; i++) {
      const warmup = await callRoute('ROOM01', clientIp);
      expect(warmup.status).toBe(200);
    }

    // The final request inside the window must still be served normally.
    const response = await callRoute('ROOM01', clientIp);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.roomCode).toBe('ROOM01');
    expect(response.headers.get('Retry-After')).toBeNull();
  });

  it('returns 429 once RATE_LIMIT_GAME_GET requests in the window are exceeded', async () => {
    const clientIp = '10.0.0.4';

    // Exhaust the window: exactly RATE_LIMIT_GAME_GET requests are allowed.
    for (let i = 0; i < RATE_LIMIT_GAME_GET; i++) {
      const allowed = await callRoute('ROOM01', clientIp);
      expect(allowed.status).toBe(200);
    }

    const response = await callRoute('ROOM01', clientIp);
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
