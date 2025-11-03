import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { GameState } from '@/lib/game-types';
import {
  filterValidCategories,
  isValidPlayerId,
  sanitizePlayerName,
  sanitizeSpicyLevelInput,
} from '@/lib/player-validation';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/game-utils';
import { storage } from '@/lib/storage-adapter';
import { sanitizeHtml, truncateInput } from '@/lib/utils/security';

function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:image/')) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function sanitizeAnswers(answers: unknown, playerIds: Set<string>): Record<string, string> {
  if (!answers || typeof answers !== 'object') {
    return {};
  }

  const sanitized: Record<string, string> = {};

  for (const [id, value] of Object.entries(answers as Record<string, unknown>)) {
    if (!playerIds.has(id)) continue;
    if (typeof value !== 'string') continue;
    sanitized[id] = sanitizeHtml(truncateInput(value, 5000));
  }

  return sanitized;
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

const updateGameSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  updates: z.record(z.any()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, playerId, updates } = updateGameSchema.parse(body);

    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(normalizedRoomCode)) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    const trimmedPlayerId = playerId.trim();
    if (!isValidPlayerId(trimmedPlayerId)) {
      return NextResponse.json({ error: 'Invalid player identifier' }, { status: 400 });
    }

    const game = await storage.games.get(normalizedRoomCode);
    if (!game) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!game.playerIds.includes(trimmedPlayerId)) {
      return NextResponse.json({ error: 'Not in this game' }, { status: 403 });
    }

    if ('playerIds' in updates || 'hostId' in updates || 'roomCode' in updates) {
      return NextResponse.json({ error: 'Attempted to modify restricted fields' }, { status: 400 });
    }

    const playerIdSet = new Set(game.playerIds);
    const sanitizedUpdates: Partial<GameState> = {};

    if ('players' in updates) {
      if (!Array.isArray(updates.players)) {
        return NextResponse.json({ error: 'Invalid player payload' }, { status: 400 });
      }

      if (updates.players.length !== game.players.length) {
        return NextResponse.json({ error: 'Player list mismatch' }, { status: 400 });
      }

      const overrides = new Map<string, GameState['players'][number]>();

      for (const rawPlayer of updates.players) {
        if (!rawPlayer || typeof rawPlayer !== 'object') {
          return NextResponse.json({ error: 'Invalid player payload' }, { status: 400 });
        }

        const id = typeof rawPlayer.id === 'string' ? rawPlayer.id.trim() : '';
        if (!playerIdSet.has(id) || overrides.has(id)) {
          return NextResponse.json({ error: 'Invalid player identifier' }, { status: 400 });
        }

        const current = game.players.find((player) => player.id === id)!;

        let name = current.name;
        if ('name' in rawPlayer) {
          if (typeof rawPlayer.name !== 'string') {
            return NextResponse.json({ error: 'Invalid player name' }, { status: 400 });
          }
          const sanitizedName = sanitizePlayerName(rawPlayer.name);
          if (!sanitizedName) {
            return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
          }
          name = sanitizedName;
        }

        let isReady = current.isReady;
        if ('isReady' in rawPlayer) {
          if (typeof rawPlayer.isReady !== 'boolean') {
            return NextResponse.json({ error: 'Invalid ready flag' }, { status: 400 });
          }
          isReady = rawPlayer.isReady;
        }

        let selectedCategories = current.selectedCategories;
        if ('selectedCategories' in rawPlayer) {
          selectedCategories = filterValidCategories(rawPlayer.selectedCategories);
        }

        let selectedSpicyLevel = current.selectedSpicyLevel;
        if ('selectedSpicyLevel' in rawPlayer) {
          const value = rawPlayer.selectedSpicyLevel;
          if (value === undefined || value === null) {
            selectedSpicyLevel = undefined;
          } else if (typeof value === 'string') {
            const sanitizedLevel = sanitizeSpicyLevelInput(value);
            if (!sanitizedLevel) {
              return NextResponse.json({ error: 'Invalid spicy level' }, { status: 400 });
            }
            selectedSpicyLevel =
              sanitizedLevel as GameState['players'][number]['selectedSpicyLevel'];
          } else {
            return NextResponse.json({ error: 'Invalid spicy level' }, { status: 400 });
          }
        }

        if (id !== trimmedPlayerId) {
          if ('name' in rawPlayer && name !== current.name) {
            return NextResponse.json({ error: 'Cannot rename other players' }, { status: 400 });
          }

          if ('selectedCategories' in rawPlayer) {
            if (!arraysEqual(selectedCategories, current.selectedCategories)) {
              return NextResponse.json(
                { error: 'Cannot change other players categories' },
                { status: 400 }
              );
            }
            selectedCategories = current.selectedCategories;
          }

          if (
            'selectedSpicyLevel' in rawPlayer &&
            selectedSpicyLevel !== current.selectedSpicyLevel &&
            selectedSpicyLevel !== undefined
          ) {
            return NextResponse.json(
              { error: 'Cannot change other players spicy level' },
              { status: 400 }
            );
          }

          if ('isReady' in rawPlayer && rawPlayer.isReady === true && !current.isReady) {
            return NextResponse.json({ error: 'Cannot ready other players' }, { status: 400 });
          }
        }

        overrides.set(id, {
          ...current,
          name,
          isReady,
          selectedCategories,
          selectedSpicyLevel,
        });
      }

      sanitizedUpdates.players = game.players.map((player) => overrides.get(player.id) ?? player);
    }

    if ('commonCategories' in updates) {
      sanitizedUpdates.commonCategories = filterValidCategories(updates.commonCategories);
    }

    if ('totalQuestions' in updates) {
      const value = Number(updates.totalQuestions);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: 'Invalid totalQuestions value' }, { status: 400 });
      }
      sanitizedUpdates.totalQuestions = Math.min(Math.floor(value), 100);
    }

    if ('currentQuestionIndex' in updates) {
      const value = Number(updates.currentQuestionIndex);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: 'Invalid currentQuestionIndex value' }, { status: 400 });
      }
      sanitizedUpdates.currentQuestionIndex = Math.min(Math.floor(value), 200);
    }

    if ('currentQuestion' in updates) {
      if (typeof updates.currentQuestion !== 'string') {
        return NextResponse.json({ error: 'Invalid current question' }, { status: 400 });
      }
      sanitizedUpdates.currentQuestion = sanitizeHtml(truncateInput(updates.currentQuestion, 1000));
    }

    if ('summary' in updates) {
      if (typeof updates.summary !== 'string') {
        return NextResponse.json({ error: 'Invalid summary' }, { status: 400 });
      }
      sanitizedUpdates.summary = sanitizeHtml(truncateInput(updates.summary, 10000));
    }

    if ('chaosMode' in updates) {
      if (typeof updates.chaosMode !== 'boolean') {
        return NextResponse.json({ error: 'Invalid chaos mode flag' }, { status: 400 });
      }
      sanitizedUpdates.chaosMode = updates.chaosMode;
    }

    if ('finalSpicyLevel' in updates) {
      const sanitizedLevel = sanitizeSpicyLevelInput(updates.finalSpicyLevel);
      if (!sanitizedLevel) {
        return NextResponse.json({ error: 'Invalid spicy level' }, { status: 400 });
      }
      sanitizedUpdates.finalSpicyLevel = sanitizedLevel as GameState['finalSpicyLevel'];
    }

    if ('completedAt' in updates) {
      if (
        typeof updates.completedAt !== 'string' ||
        Number.isNaN(Date.parse(updates.completedAt))
      ) {
        return NextResponse.json({ error: 'Invalid completion timestamp' }, { status: 400 });
      }
      sanitizedUpdates.completedAt = updates.completedAt;
    }

    if ('imageGenerationCount' in updates) {
      const value = Number(updates.imageGenerationCount);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: 'Invalid image generation count' }, { status: 400 });
      }
      sanitizedUpdates.imageGenerationCount = Math.min(Math.floor(value), 3);
    }

    if ('visualMemories' in updates) {
      if (!Array.isArray(updates.visualMemories)) {
        return NextResponse.json({ error: 'Invalid visual memories payload' }, { status: 400 });
      }

      sanitizedUpdates.visualMemories = updates.visualMemories
        .filter(
          (memory: unknown): memory is { imageUrl: string; prompt: string; timestamp?: number } => {
            if (!memory || typeof memory !== 'object') return false;
            const candidate = memory as Record<string, unknown>;
            return isSafeImageUrl(candidate.imageUrl) && typeof candidate.prompt === 'string';
          }
        )
        .slice(0, 3)
        .map((memory: any) => ({
          imageUrl: memory.imageUrl,
          prompt: sanitizeHtml(truncateInput(memory.prompt, 500)),
          timestamp:
            typeof memory.timestamp === 'number' && Number.isFinite(memory.timestamp)
              ? memory.timestamp
              : Date.now(),
        }));
    }

    if ('gameRounds' in updates) {
      if (!Array.isArray(updates.gameRounds)) {
        return NextResponse.json({ error: 'Invalid game rounds payload' }, { status: 400 });
      }

      const sanitizedRounds: GameState['gameRounds'] = [];

      for (const round of updates.gameRounds) {
        if (!round || typeof round !== 'object') {
          return NextResponse.json({ error: 'Invalid game round' }, { status: 400 });
        }

        const candidate = round as Record<string, unknown>;
        if (typeof candidate.question !== 'string') {
          return NextResponse.json({ error: 'Invalid question in round' }, { status: 400 });
        }

        sanitizedRounds.push({
          question: sanitizeHtml(truncateInput(candidate.question, 1000)),
          answers: sanitizeAnswers(candidate.answers, playerIdSet),
        });
      }

      sanitizedUpdates.gameRounds = sanitizedRounds;
    }

    if ('step' in updates) {
      if (typeof updates.step !== 'string') {
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
      }
      const allowedSteps: GameState['step'][] = ['lobby', 'categories', 'spicy', 'game', 'summary'];
      if (!allowedSteps.includes(updates.step as GameState['step'])) {
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
      }
      sanitizedUpdates.step = updates.step as GameState['step'];
    }

    const updatedGame = await storage.games.update(normalizedRoomCode, sanitizedUpdates);

    if (!updatedGame) {
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}
