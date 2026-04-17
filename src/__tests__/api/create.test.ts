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
import { POST } from '@/app/api/game/create/route';
import type { GameState } from '@/lib/game-types';

const mockAuth = vi.mocked(auth);
const mockGamesGet = vi.mocked(storage.games.get);
const mockGamesCreate = vi.mocked(storage.games.create);

function makeRequest(body: unknown): Request {
  const json = JSON.stringify(body);
  return new Request('http://localhost/api/game/create', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(json.length),
    },
    body: json,
  });
}

const mockGameState: GameState = {
  step: 'lobby',
  players: [
    { id: 'test-user-id', name: 'Alice', email: '', isReady: false, selectedCategories: [] },
  ],
  playerIds: ['test-user-id'],
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

describe('POST /api/game/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockRateLimitCheck.mockReturnValue({ allowed: true });
    mockGamesGet.mockResolvedValue(undefined);
    mockGamesCreate.mockResolvedValue(mockGameState);
  });

  it('returns 201 with game object when request is valid', async () => {
    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty('game');
    expect(body.game).toHaveProperty('roomCode');
    expect(mockGamesCreate).toHaveBeenCalledOnce();
  });

  it('returns 400 when playerName is missing', async () => {
    const request = makeRequest({ roomCode: 'ROOM-01' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when roomCode is missing', async () => {
    const request = makeRequest({ playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when room code is already in use', async () => {
    mockGamesGet.mockResolvedValue(mockGameState);

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('ROOM_CODE_IN_USE');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimitCheck.mockReturnValue({ allowed: false });
    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 413 when request body is too large', async () => {
    const request = new Request('http://localhost/api/game/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2000000', // 2MB - exceeds 1MB limit
      },
      body: JSON.stringify({ roomCode: 'ROOM-01', playerName: 'Alice' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
