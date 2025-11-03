import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  applyChaosMode,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '@/lib/game-utils';

describe('Chaos Mode', () => {
  describe('applyChaosMode', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.restoreAllMocks();
    });

    it('should return base level when chaos mode is disabled', () => {
      const result = applyChaosMode('Medium', false);
      expect(result.level).toBe('Medium');
      expect(result.wasUpgraded).toBe(false);
    });

    it('should return base level when random value > 0.2 (80% case)', () => {
      // Mock Math.random to return 0.5 (> 0.2)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = applyChaosMode('Medium', true);
      expect(result.level).toBe('Medium');
      expect(result.wasUpgraded).toBe(false);
    });

    it('should upgrade level when random value <= 0.2 (20% case)', () => {
      // Mock Math.random to return 0.1 (<= 0.2)
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = applyChaosMode('Medium', true);
      expect(result.level).toBe('Hot');
      expect(result.wasUpgraded).toBe(true);
    });

    it('should upgrade Mild to Medium', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = applyChaosMode('Mild', true);
      expect(result.level).toBe('Medium');
      expect(result.wasUpgraded).toBe(true);
    });

    it('should upgrade Medium to Hot', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = applyChaosMode('Medium', true);
      expect(result.level).toBe('Hot');
      expect(result.wasUpgraded).toBe(true);
    });

    it('should upgrade Hot to Extra-Hot', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = applyChaosMode('Hot', true);
      expect(result.level).toBe('Extra-Hot');
      expect(result.wasUpgraded).toBe(true);
    });

    it('should NOT upgrade Extra-Hot (already at max)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = applyChaosMode('Extra-Hot', true);
      expect(result.level).toBe('Extra-Hot');
      expect(result.wasUpgraded).toBe(false);
    });

    it('should have approximately 20% upgrade rate over many calls', () => {
      // Run 1000 iterations with real random
      const iterations = 1000;
      let upgrades = 0;

      for (let i = 0; i < iterations; i++) {
        const result = applyChaosMode('Medium', true);
        if (result.wasUpgraded) {
          upgrades++;
        }
      }

      // Should be around 20% (200 out of 1000), allow some variance
      expect(upgrades).toBeGreaterThan(150); // At least 15%
      expect(upgrades).toBeLessThan(250); // At most 25%
    });

    it('should handle all valid spicy levels', () => {
      const levels: Array<'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'> = [
        'Mild',
        'Medium',
        'Hot',
        'Extra-Hot',
      ];

      levels.forEach((level) => {
        const result = applyChaosMode(level, false);
        expect(result.level).toBe(level);
        expect(result.wasUpgraded).toBe(false);
      });
    });
  });
});

describe('room codes', () => {
  it('generates uppercase room codes using approved characters', () => {
    const code = generateRoomCode();
    expect(isValidRoomCode(code)).toBe(true);
    expect(code).toEqual(code.toUpperCase());
  });

  it('normalizes arbitrary input into a valid code shape', () => {
    const raw = ' lion-wolf-fox-42 ';
    const normalized = normalizeRoomCode(raw);

    expect(normalized).toBe('LION-WOLF-FOX-42');
    expect(isValidRoomCode(normalized)).toBe(true);
  });
});
