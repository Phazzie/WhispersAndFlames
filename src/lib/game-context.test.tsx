
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { GameProvider, useGame } from './game-context';
import { OnlineGameAdapter, LocalGameAdapter } from './game-adapters';
import type { GameState } from './game-types';

// Mock adapters
const mockOnlineAdapterInstance = {
  get: vi.fn(),
  update: vi.fn(),
  subscribe: vi.fn(),
};

const mockLocalAdapterInstance = {
  get: vi.fn(),
  update: vi.fn(),
  subscribe: vi.fn(),
};

vi.mock('./game-adapters', () => {
  return {
    OnlineGameAdapter: class {
        constructor() {
            return mockOnlineAdapterInstance;
        }
    },
    LocalGameAdapter: class {
        constructor() {
            return mockLocalAdapterInstance;
        }
    },
  };
});

const mockGameState: GameState = {
  step: 'lobby',
  players: [],
  playerIds: [],
  hostId: 'host1',
  gameMode: 'online',
  commonCategories: [],
  finalSpicyLevel: 'Mild',
  chaosMode: false,
  gameRounds: [],
  currentQuestion: '',
  currentQuestionIndex: 0,
  totalQuestions: 0,
  summary: '',
  imageGenerationCount: 0,
  roomCode: 'ABCD',
  createdAt: new Date(),
};

const TestComponent = () => {
  const { gameState, isLoading, error, updateGame } = useGame();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!gameState) return <div>No Game State</div>;

  return (
    <div>
      <div data-testid="room-code">{gameState.roomCode}</div>
      <button onClick={() => updateGame({ step: 'game' })}>Start Game</button>
    </div>
  );
};

describe('GameProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOnlineAdapterInstance.get.mockResolvedValue(mockGameState);
    mockOnlineAdapterInstance.update.mockResolvedValue({ ...mockGameState, step: 'game' });
    mockOnlineAdapterInstance.subscribe.mockReturnValue({ unsubscribe: vi.fn() });

    mockLocalAdapterInstance.get.mockResolvedValue({ ...mockGameState, gameMode: 'local' });
    mockLocalAdapterInstance.update.mockResolvedValue({ ...mockGameState, gameMode: 'local', step: 'game' });
    mockLocalAdapterInstance.subscribe.mockReturnValue({ unsubscribe: vi.fn() });
  });

  it('uses OnlineGameAdapter by default', async () => {
    await act(async () => {
      render(
        <GameProvider roomCode="ABCD">
          <TestComponent />
        </GameProvider>
      );
    });

    // Check if methods on the instance were called.
    // Since we return the singleton instance from constructor, checking the instance methods is enough.
    expect(mockOnlineAdapterInstance.get).toHaveBeenCalledWith('ABCD');
    expect(mockLocalAdapterInstance.get).not.toHaveBeenCalled();
  });

  it('uses LocalGameAdapter when gameMode is local', async () => {
    await act(async () => {
      render(
        <GameProvider roomCode="ABCD" gameMode="local">
          <TestComponent />
        </GameProvider>
      );
    });

    expect(mockLocalAdapterInstance.get).toHaveBeenCalledWith('ABCD');
    expect(mockOnlineAdapterInstance.get).not.toHaveBeenCalled();
  });

  it('provides game state to consumers', async () => {
    await act(async () => {
      render(
        <GameProvider roomCode="ABCD">
          <TestComponent />
        </GameProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('room-code')).toHaveTextContent('ABCD');
    });
  });

  it('updates game state', async () => {
    await act(async () => {
      render(
        <GameProvider roomCode="ABCD">
          <TestComponent />
        </GameProvider>
      );
    });

    await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    })

    const button = screen.getByText('Start Game');
    await act(async () => {
      button.click();
    });

    expect(mockOnlineAdapterInstance.update).toHaveBeenCalledWith('ABCD', { step: 'game' });
  });

   it('handles subscription updates', async () => {
        let callback: (state: GameState) => void = () => {};
        mockOnlineAdapterInstance.subscribe.mockImplementation((_: string, cb: (state: GameState) => void) => {
            callback = cb;
            return { unsubscribe: vi.fn() };
        });

        await act(async () => {
            render(
                <GameProvider roomCode="ABCD">
                    <TestComponent />
                </GameProvider>
            );
        });

        await waitFor(() => {
             expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        const updatedState = { ...mockGameState, roomCode: 'XYZ' };

        await act(async () => {
             callback(updatedState);
        });

        expect(screen.getByTestId('room-code')).toHaveTextContent('XYZ');
    });
});
