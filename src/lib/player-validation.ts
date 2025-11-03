import type { SpicyLevel as SpicyLevelType } from './constants';
import { CATEGORIES, SPICY_LEVELS } from './constants';
import { sanitizeHtml, truncateInput } from './utils/security';

export const PLAYER_NAME_MAX_LENGTH = 32;

const PLAYER_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

const CATEGORY_SET = new Set(CATEGORIES.map((category) => category.name));
const SPICY_LEVEL_SET = new Set<string>(SPICY_LEVELS.map((level) => level.name));

export function isValidPlayerId(playerId: string): boolean {
  return PLAYER_ID_PATTERN.test(playerId);
}

export function sanitizePlayerName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return '';
  }

  const sanitized = sanitizeHtml(trimmed).replace(/\s+/g, ' ').trim();
  return truncateInput(sanitized, PLAYER_NAME_MAX_LENGTH);
}

export function filterValidCategories(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const entry of categories) {
    if (typeof entry !== 'string') continue;
    const sanitized = sanitizeHtml(entry).trim();
    if (!CATEGORY_SET.has(sanitized) || seen.has(sanitized)) continue;
    seen.add(sanitized);
    valid.push(sanitized);
  }

  return valid;
}

export function sanitizeSpicyLevelInput(level: unknown): SpicyLevelType['name'] | undefined {
  if (typeof level !== 'string') return undefined;
  const sanitized = sanitizeHtml(level).trim();
  return SPICY_LEVEL_SET.has(sanitized) ? (sanitized as SpicyLevelType['name']) : undefined;
}
