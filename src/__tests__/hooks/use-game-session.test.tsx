import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { GameState } from '@/lib/game-types';
import { useGameSession } from '@/hooks/use-game-session';
import { clientGame } from '@/lib/client-game';
import { localGame } from '@/lib/local-game';

vi.mock('@/lib/client-game', () => ({
  clientGame: {
    get: vi.fn(),
    update: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('@/lib/local-game', () => ({
  localGame: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

const baseGame: GameState = {
  step: 'lobby',
  players: [{ id: 'u1', name: 'A', isReady: false, email: '', selectedCategories: [] }],
  playerIds: ['u1'],
  hostId: 'u1',
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

describe('useGameSession', () => {
  const toast = vi.fn();
  const router = { push: vi.fn() } as unknown as never;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localGame.get).mockReturnValue(null);
    vi.mocked(clientGame.get).mockResolvedValue(baseGame);
    vi.mocked(clientGame.subscribe).mockReturnValue({ unsubscribe: vi.fn() });
    vi.mocked(clientGame.update).mockResolvedValue(baseGame);
  });

  it('loads game successfully and subscribes', async () => {
    const { result } = renderHook(() =>
      useGameSession({
        roomCode: 'ROOM-01',
        isInvalidRoomCode: false,
        user: { id: 'u1' } as never,
        isLoaded: true,
        router: router as never,
        toast,
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.gameState?.roomCode).toBe('ROOM-01');
    expect(clientGame.subscribe).toHaveBeenCalled();
  });

  it('sets error when load fails', async () => {
    vi.mocked(clientGame.get).mockRejectedValue(new Error('load failed'));
    const { result } = renderHook(() =>
      useGameSession({
        roomCode: 'ROOM-01',
        isInvalidRoomCode: false,
        user: { id: 'u1' } as never,
        isLoaded: true,
        router: router as never,
        toast,
      })
    );

    await waitFor(() => expect(result.current.error).toBe('load failed'));
  });

  it('updates local game in local mode', async () => {
    vi.mocked(localGame.get).mockReturnValue({ ...baseGame, gameMode: 'local' });
    vi.mocked(localGame.update).mockReturnValue({
      ...baseGame,
      gameMode: 'local',
      step: 'categories',
    });

    const { result } = renderHook(() =>
      useGameSession({
        roomCode: 'ROOM-01',
        isInvalidRoomCode: false,
        user: null,
        isLoaded: true,
        router: router as never,
        toast,
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.updateGameState({ step: 'categories' });
    });

    expect(localGame.update).toHaveBeenCalledWith('ROOM-01', { step: 'categories' });
  });
});
