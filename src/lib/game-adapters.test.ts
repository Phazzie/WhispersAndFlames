import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnlineGameAdapter } from './game-adapters';
import { clientGame } from './client-game';
import type { GameState } from './game-types';

// Mock clientGame
vi.mock('./client-game', () => ({
  clientGame: {
    get: vi.fn(),
    update: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('OnlineGameAdapter', () => {
  let adapter: OnlineGameAdapter;

  beforeEach(() => {
    adapter = new OnlineGameAdapter();
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return game state when clientGame.get succeeds', async () => {
      const mockGame: Partial<GameState> = { roomCode: 'ABCD' };
      vi.mocked(clientGame.get).mockResolvedValue(mockGame as GameState);

      const result = await adapter.get('ABCD');

      expect(clientGame.get).toHaveBeenCalledWith('ABCD');
      expect(result).toEqual(mockGame);
    });

    it('should return null when clientGame.get fails', async () => {
      vi.mocked(clientGame.get).mockRejectedValue(new Error('Not found'));

      const result = await adapter.get('ABCD');

      expect(clientGame.get).toHaveBeenCalledWith('ABCD');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should return updated game state', async () => {
      const mockGame: Partial<GameState> = { roomCode: 'ABCD', step: 'game' };
      const updates: Partial<GameState> = { step: 'game' };
      vi.mocked(clientGame.update).mockResolvedValue(mockGame as GameState);

      const result = await adapter.update('ABCD', updates);

      expect(clientGame.update).toHaveBeenCalledWith('ABCD', updates);
      expect(result).toEqual(mockGame);
    });
  });

  describe('subscribe', () => {
    it('should call clientGame.subscribe and return unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      const mockCallback = vi.fn();
      vi.mocked(clientGame.subscribe).mockReturnValue({ unsubscribe: mockUnsubscribe });

      const result = adapter.subscribe('ABCD', mockCallback);

      expect(clientGame.subscribe).toHaveBeenCalledWith('ABCD', mockCallback);
      expect(result).toEqual({ unsubscribe: mockUnsubscribe });
    });
  });
});
