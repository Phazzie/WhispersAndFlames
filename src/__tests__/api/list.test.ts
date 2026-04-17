import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth before importing route
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}));

// Mock storage adapter
vi.mock('@/lib/storage-adapter', () => ({
  storage: {
    games: {
      list: vi.fn(),
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

import { auth } from '@clerk/nextjs/server';
import { storage } from '@/lib/storage-adapter';
import { GET } from '@/app/api/game/list/route';
import type { GameState } from '@/lib/game-types';

const mockAuth = vi.mocked(auth);
const mockGamesList = vi.mocked(storage.games.list);

const sampleGame: GameState = {
  step: 'summary',
  players: [
    { id: 'test-user-id', name: 'Alice', email: '', isReady: true, selectedCategories: [] },
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
  roomCode: 'ROOM01',
};

describe('GET /api/game/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'test-user-id' } as Awaited<ReturnType<typeof auth>>);
    mockGamesList.mockResolvedValue([sampleGame]);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with games array when authenticated', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('games');
    expect(Array.isArray(body.games)).toBe(true);
    expect(body.games).toHaveLength(1);
    expect(mockGamesList).toHaveBeenCalledWith('test-user-id');
  });

  it('returns 500 when storage throws', async () => {
    mockGamesList.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
