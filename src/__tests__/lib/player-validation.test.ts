import { describe, expect, it } from 'vitest';

import {
  filterValidCategories,
  isValidPlayerId,
  sanitizePlayerName,
  sanitizeSpicyLevelInput,
} from '@/lib/player-validation';

describe('player-validation', () => {
  it('sanitizes player names and enforces length', () => {
    const input = "  <script>alert('x')</script>  Captain   Sparks  ";
    const sanitized = sanitizePlayerName(input);

    expect(sanitized).toBe('Captain Sparks');
    expect(sanitized.length).toBeLessThanOrEqual(32);
  });

  it('rejects invalid player ids', () => {
    expect(isValidPlayerId('short')).toBe(false);
    expect(isValidPlayerId('valid-id-1234')).toBe(true);
    expect(isValidPlayerId('inv@lid')).toBe(false);
  });

  it('filters categories against the canonical list', () => {
    const categories = filterValidCategories([
      'Hidden Attractions',
      'Hidden Attractions',
      '<b>Power Play</b>',
      'Not real',
    ]);

    expect(categories).toEqual(['Hidden Attractions', 'Power Play']);
  });

  it('sanitizes spicy level selections', () => {
    expect(sanitizeSpicyLevelInput(' Hot ')).toBe('Hot');
    expect(sanitizeSpicyLevelInput('forbidden')).toBeUndefined();
    expect(sanitizeSpicyLevelInput(undefined)).toBeUndefined();
  });
});
