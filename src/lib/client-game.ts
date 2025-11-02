/**
 * Client-side game management utilities
 */

import type { PlayerIdentity } from '@/hooks/use-player-identity';
import type { GameState } from './game-types';

type GameError = Error & { status?: number };

async function handleResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }

  let errorMessage = 'Request failed';
  try {
    const data = await response.json();
    if (data?.error) {
      errorMessage = data.error;
    }
  } catch {
    // ignore JSON parsing errors
  }

  const error = new Error(errorMessage) as GameError;
  error.status = response.status;
  throw error;
}

export const clientGame = {
  create: async (roomCode: string, player: PlayerIdentity): Promise<GameState> => {
    const payload = {
      roomCode,
      playerId: player.id,
      playerName: player.name.trim(),
    };
    const response = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await handleResponse(response);
    return data.game as GameState;
  },

  join: async (roomCode: string, player: PlayerIdentity): Promise<GameState> => {
    const payload = {
      roomCode,
      playerId: player.id,
      playerName: player.name.trim(),
    };
    const response = await fetch('/api/game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await handleResponse(response);
    return data.game as GameState;
  },

  get: async (roomCode: string, playerId: string): Promise<GameState> => {
    const response = await fetch(`/api/game/${roomCode}`, {
      method: 'GET',
      headers: {
        'x-player-id': playerId,
      },
    });

    const data = await handleResponse(response);
    return data.game as GameState;
  },

  update: async (
    roomCode: string,
    playerId: string,
    updates: Partial<GameState>
  ): Promise<GameState> => {
    const response = await fetch('/api/game/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, playerId, updates }),
    });

    const data = await handleResponse(response);
    return data.game as GameState;
  },

  subscribe: (
    roomCode: string,
    playerId: string,
    callback: (state: GameState) => void
  ): { unsubscribe: () => void } => {
    const intervalId = setInterval(async () => {
      try {
        const game = await clientGame.get(roomCode, playerId);
        callback(game);
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    }, 2000);

    return {
      unsubscribe: () => clearInterval(intervalId),
    };
  },
};
