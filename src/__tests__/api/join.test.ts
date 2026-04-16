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
import { POST } from '@/app/api/game/join/route';
import type { GameState } from '@/lib/game-types';

const mockAuth = vi.mocked(auth);
const mockGamesGet = vi.mocked(storage.games.get);
const mockGamesUpdate = vi.mocked(storage.games.update);

function makeRequest(body: unknown): Request {
  const json = JSON.stringify(body);
  return new Request('http://localhost/api/game/join', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(json.length),
    },
    body: json,
  });
}

const existingGame: GameState = {
  step: 'lobby',
  players: [
    { id: 'host-user-id', name: 'Host', email: '', isReady: false, selectedCategories: [] },
  ],
  playerIds: ['host-user-id'],
  hostId: 'host-user-id',
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

const gameWithJoinedPlayer: GameState = {
  ...existingGame,
  players: [
    ...existingGame.players,
    { id: 'test-user-id', name: 'Alice', email: '', isReady: false, selectedCategories: [] },
  ],
  playerIds: [...existingGame.playerIds, 'test-user-id'],
};

describe('POST /api/game/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockRateLimitCheck.mockReturnValue({ allowed: true });
    mockGamesGet.mockResolvedValue(existingGame);
    mockGamesUpdate.mockResolvedValue(gameWithJoinedPlayer);
  });

  it('returns 200 with updated game when join is valid', async () => {
    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('game');
    expect(mockGamesUpdate).toHaveBeenCalledOnce();
  });

  it('returns 404 when room is not found', async () => {
    mockGamesGet.mockResolvedValue(undefined);

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('GAME_NOT_FOUND');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with existing game state when player is already in game (idempotent via playerIds)', async () => {
    // Simulate user already being in the game
    const gameWithPlayer: GameState = {
      ...existingGame,
      players: [
        ...existingGame.players,
        { id: 'test-user-id', name: 'Alice', email: '', isReady: false, selectedCategories: [] },
      ],
      playerIds: [...existingGame.playerIds, 'test-user-id'],
    };
    mockGamesGet.mockResolvedValue(gameWithPlayer);

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('game');
    // Should NOT call update since player is already present
    expect(mockGamesUpdate).not.toHaveBeenCalled();
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

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimitCheck.mockReturnValue({ allowed: false });

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 200 with existing game when player is in players array but not playerIds (idempotency guard)', async () => {
    // Edge case: player is in players[] but not in playerIds — still idempotent
    const gameWithPlayerInArrayOnly: GameState = {
      ...existingGame,
      players: [
        ...existingGame.players,
        { id: 'test-user-id', name: 'Alice', email: '', isReady: false, selectedCategories: [] },
      ],
      // Note: playerIds does NOT include 'test-user-id'
      playerIds: [...existingGame.playerIds],
    };
    mockGamesGet.mockResolvedValue(gameWithPlayerInArrayOnly);

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('game');
    // Should NOT call update because player already exists in players array
    expect(mockGamesUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when storage.games.update throws', async () => {
    mockGamesUpdate.mockRejectedValue(new Error('DB unavailable'));

    const request = makeRequest({ roomCode: 'ROOM-01', playerName: 'Alice' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
