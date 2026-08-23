import { describe, it, expect } from 'vitest';

import {
  DR_EMBER_CRAFT_RAILS,
  DR_EMBER_IDENTITY,
  EMBER_CRAFT_RAILS,
  EMBER_IDENTITY,
  QUESTION_PATTERNS,
  SCRIBE_IDENTITY,
  SPICY_LADDER,
  VISUAL_POET_IDENTITY,
} from '@/ai/personas';

/**
 * Regression guard for the April 2026 persona loss.
 *
 * PR #61's DRY audit deleted ~409 lines of persona from the prompt files and
 * pointed at a markdown document as the "single source of truth" — but nothing
 * in src/ ever read that document, so the personas silently stopped reaching
 * the model for four months.
 *
 * These tests assert the load-bearing pieces are present in code, not in prose
 * somewhere. They are deliberately about behaviour-shaping content — the spicy
 * ladder, the content rail, the few-shot patterns — rather than exact wording,
 * so the voice can be edited without breaking the suite.
 */
describe('AI personas', () => {
  describe('spicy ladder', () => {
    it('defines every spicy level the game offers', () => {
      // The prompt tells the model to "match {{spicyLevel}}". Without these
      // definitions the four difficulty tiers are uncalibrated guesses.
      for (const level of ['Mild', 'Medium', 'Hot', 'Extra-Hot']) {
        expect(SPICY_LADDER).toContain(level);
      }
    });

    it('gives each level a substantive description, not just a label', () => {
      for (const line of SPICY_LADDER.trim().split('\n')) {
        const [, description = ''] = line.split(':');
        expect(description.trim().length).toBeGreaterThan(20);
      }
    });
  });

  describe('craft rails', () => {
    it('keeps the content boundary for an intimacy app', () => {
      // "Playful, not porny" is the taste and safety rail, not decoration.
      expect(EMBER_CRAFT_RAILS).toContain('PLAYFUL, NOT PORNY');
      expect(EMBER_CRAFT_RAILS).toContain('never crude');
    });

    it('keeps the escalation arc', () => {
      expect(EMBER_CRAFT_RAILS).toContain('BUILD INCREMENTALLY');
    });

    it('keeps the good/bad calibration pair for specificity', () => {
      expect(EMBER_CRAFT_RAILS).toContain('garbage');
      expect(EMBER_CRAFT_RAILS).toContain('gold');
    });
  });

  describe('question patterns', () => {
    const patterns = QUESTION_PATTERNS.split('\n').filter((l) => l.startsWith('THE '));

    it('ships all nine named patterns', () => {
      expect(patterns).toHaveLength(9);
    });

    it('gives every pattern a worked example', () => {
      // Few-shot examples steer output quality far more than adjectives do.
      const examples = QUESTION_PATTERNS.split('\n').filter((l) => l.startsWith('Example:'));
      expect(examples).toHaveLength(patterns.length);
      for (const example of examples) {
        expect(example.length).toBeGreaterThan(40);
      }
    });
  });

  describe('every persona', () => {
    const personas = {
      EMBER_IDENTITY,
      SCRIBE_IDENTITY,
      DR_EMBER_IDENTITY,
      VISUAL_POET_IDENTITY,
      DR_EMBER_CRAFT_RAILS,
    };

    it('carries real character, not a one-line adjective list', () => {
      // The April rewrite reduced each persona to a sentence of adjectives.
      // A persona that thin no longer transfers voice to the model.
      for (const [name, text] of Object.entries(personas)) {
        expect(text.length, `${name} is too short to carry a voice`).toBeGreaterThan(300);
      }
    });

    it('contains no unresolved template placeholders', () => {
      for (const [name, text] of Object.entries(personas)) {
        expect(text, `${name} leaks a JS placeholder`).not.toMatch(/\$\{/);
      }
    });
  });
});
