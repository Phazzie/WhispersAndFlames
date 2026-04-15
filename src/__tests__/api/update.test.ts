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
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock security utilities to control rate limiting
vi.mock('@/lib/utils/security', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
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
}));

import { auth } from '@clerk/nextjs/server';
import { storage } from '@/lib/storage-adapter';
import { checkRateLimit } from '@/lib/utils/security';
import { POST } from '@/app/api/game/update/route';
import type { GameState } from '@/lib/game-types';

const mockAuth = vi.mocked(auth);
const mockGamesGet = vi.mocked(storage.games.get);
const mockGamesUpdate = vi.mocked(storage.games.update);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

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

describe('POST /api/game/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockCheckRateLimit.mockReturnValue(true);
    mockGamesGet.mockResolvedValue(participantGame);
    mockGamesUpdate.mockResolvedValue(updatedGame);
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
    mockCheckRateLimit.mockReturnValue(false);

    const request = makeRequest({
      roomCode: 'ROOM-01',
      updates: { step: 'categories' },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
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
    expect(mockGamesUpdate).toHaveBeenCalledWith(
      'ROOM-01',
      expect.objectContaining({
        step: 'game',
        chaosMode: true,
        finalSpicyLevel: 'Hot',
        currentQuestionIndex: 1,
      })
    );
  });
});
