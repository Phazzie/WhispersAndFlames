import { CHAOS_MODE_UPGRADE_PROBABILITY } from './api-constants';
import type { GameRound, Player } from './game-types';
import { createLogger } from './utils/logger';

const ANIMALS: string[] = [
  'LION',
  'TIGER',
  'BEAR',
  'WOLF',
  'FOX',
  'EAGLE',
  'SHARK',
  'PANTHER',
  'LEOPARD',
  'JAGUAR',
  'COBRA',
  'VIPER',
  'DRAGON',
  'PHOENIX',
  'GRIFFIN',
  'HYDRA',
  'STALLION',
  'HAWK',
  'FALCON',
  'OWL',
  'RAVEN',
  'CROW',
  'BULL',
  'STAG',
  'BOAR',
  'RHINO',
];

const logger = createLogger('game-utils');

const ROOM_CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoomCode(): string {
  const parts = new Set<string>();
  while (parts.size < 3) {
    parts.add(getRandomItem(ANIMALS));
  }
  const number = Math.floor(10 + Math.random() * 90); // 10-99

  return `${[...parts].join('-')}-${number}`;
}

export function normalizeRoomCode(roomCode: string): string {
  const cleaned = roomCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  return cleaned.replace(/^-+/, '').replace(/-+$/, '');
}

export function isValidRoomCode(roomCode: string): boolean {
  const normalized = normalizeRoomCode(roomCode);
  return ROOM_CODE_PATTERN.test(normalized);
}

export function applyChaosMode(
  baseLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot',
  chaosEnabled: boolean
): { level: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'; wasUpgraded: boolean } {
  try {
    if (!chaosEnabled) {
      return { level: baseLevel, wasUpgraded: false };
    }

    const randomValue = Math.random();

    const levels: Array<'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'> = [
      'Mild',
      'Medium',
      'Hot',
      'Extra-Hot',
    ];
    const currentIndex = levels.indexOf(baseLevel);

    if (currentIndex === -1) {
      logger.error('Invalid base level for chaos mode', undefined, { baseLevel });
      return { level: baseLevel, wasUpgraded: false };
    }

    if (randomValue > 1 - CHAOS_MODE_UPGRADE_PROBABILITY && currentIndex < levels.length - 1) {
      const upgradedLevel = levels[currentIndex + 1];
      logger.info('Chaos mode upgraded spicy level', { baseLevel, upgradedLevel });
      return { level: upgradedLevel, wasUpgraded: true };
    }

    return { level: baseLevel, wasUpgraded: false };
  } catch (error) {
    logger.error('Error applying chaos mode', error);
    return { level: baseLevel, wasUpgraded: false };
  }
}

/**
 * Build one combined-answer string per question so the AI template correctly
 * pairs answers[i] with questions[i] across all players.
 * Empty or whitespace-only answers are excluded.
 */
export function buildCombinedAnswers(gameRounds: GameRound[], players: Player[]): string[] {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  return gameRounds.map((round) =>
    Object.entries(round.answers)
      .filter(([, answer]) => typeof answer === 'string' && answer.trim().length > 0)
      .map(([playerId, answer]) => {
        const player = playerMap.get(playerId);
        return `${player?.name ?? 'Player'}: "${answer}"`;
      })
      .join(' | ')
  );
}
