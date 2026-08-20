import { describe, it, expect } from 'vitest';

import { validateCategories, validateSpicyLevel } from '@/ai/flows/shared-utils';
import { CATEGORIES, CATEGORY_NAMES, SPICY_LEVELS } from '@/lib/constants';

describe('validateCategories', () => {
  // Regression guard. shared-utils.ts used to carry its own hand-written
  // whitelist which had drifted so far from src/lib/constants.ts that the two
  // lists shared exactly one name ('Future Dreams'). Every other category was
  // filtered to nothing, and generate-contextual-questions.ts then threw
  // 'No valid categories provided' — so 9 of the 10 categories a player can
  // actually pick could not generate a single question.
  it('accepts every category the app actually offers', () => {
    const names = CATEGORIES.map((c) => c.name);

    expect(validateCategories(names)).toEqual(names);
  });

  it('accepts each category individually', () => {
    for (const name of CATEGORIES.map((c) => c.name)) {
      expect(validateCategories([name])).toEqual([name]);
    }
  });

  it('keeps CATEGORY_NAMES in step with CATEGORIES', () => {
    expect([...CATEGORY_NAMES]).toEqual(CATEGORIES.map((c) => c.name));
  });

  it('rejects a category the app does not offer', () => {
    expect(validateCategories(['Definitely Not A Category'])).toEqual([]);
  });

  it('drops unknown categories while keeping known ones', () => {
    const known = CATEGORIES[0].name;

    expect(validateCategories([known, 'Injected Category'])).toEqual([known]);
  });
});

describe('validateSpicyLevel', () => {
  it('accepts every spicy level the app actually offers', () => {
    for (const level of SPICY_LEVELS) {
      expect(validateSpicyLevel(level.name)).toBe(level.name);
    }
  });
});
