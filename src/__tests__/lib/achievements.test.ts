import { describe, it, expect } from 'vitest';

import { calculateAchievements, getPlayerName } from '@/lib/achievements';
import type { GameState } from '@/lib/game-types';

describe('Achievement System', () => {
  const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    step: 'summary',
    players: [
      {
        id: 'player-1',
        name: 'Alice',
        email: 'alice@example.com',
        isReady: false,
        selectedCategories: [],
      },
      {
        id: 'player-2',
        name: 'Bob',
        email: 'bob@example.com',
        isReady: false,
        selectedCategories: [],
      },
    ],
    playerIds: ['player-1', 'player-2'],
    hostId: 'player-1',
    gameMode: 'online',
    commonCategories: ['Hidden Attractions', 'Emotional Depths'],
    finalSpicyLevel: 'Medium',
    chaosMode: false,
    gameRounds: [
      {
        question: 'What makes you feel most connected?',
        answers: {
          'player-1': 'Deep conversations and shared experiences.',
          'player-2': 'Quality time together.',
        },
      },
      {
        question: 'What is your love language?',
        answers: {
          'player-1': 'Words of affirmation and physical touch.',
          'player-2': 'Acts of service.',
        },
      },
      {
        question: 'What do you value most in a relationship?',
        answers: {
          'player-1': 'Trust, honesty, and mutual respect.',
          'player-2': 'Communication.',
        },
      },
    ],
    currentQuestion: '',
    currentQuestionIndex: 3,
    totalQuestions: 3,
    summary: 'Test summary',
    visualMemories: [],
    imageGenerationCount: 0,
    roomCode: 'test-room',
    ...overrides,
  });

  describe('calculateAchievements', () => {
    it('should award Heart-Thrower to player with most detailed answers', () => {
      const gameState = createMockGameState();
      const achievements = calculateAchievements(gameState);

      const heartThrower = achievements.find((a) => a.id === 'heart-thrower');
      expect(heartThrower).toBeDefined();
      expect(heartThrower?.playerId).toBe('player-1');
      expect(heartThrower?.rarity).toBe('rare');
      expect(heartThrower?.name).toBe('Heart-Thrower');
    });

    it('should award Plot-Twist Picasso to player with most varied vocabulary', () => {
      const gameState = createMockGameState();
      const achievements = calculateAchievements(gameState);

      const picasso = achievements.find((a) => a.id === 'plot-twist-picasso');
      expect(picasso).toBeDefined();
      expect(picasso?.playerId).toBe('player-1');
      expect(picasso?.rarity).toBe('legendary');
    });

    it('should award Wavelength Wizards when 3+ rounds completed', () => {
      const gameState = createMockGameState();
      const achievements = calculateAchievements(gameState);

      const wizards = achievements.find((a) => a.id === 'wavelength-wizards');
      expect(wizards).toBeDefined();
      expect(wizards?.rarity).toBe('rare');
      expect(wizards?.playerId).toBeUndefined(); // Group achievement
    });

    it('should NOT award Wavelength Wizards with fewer than 3 rounds', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'Test?',
            answers: { 'player-1': 'Answer 1', 'player-2': 'Answer 2' },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);

      const wizards = achievements.find((a) => a.id === 'wavelength-wizards');
      expect(wizards).toBeUndefined();
    });

    it('should award Brave Soul (rare) for Hot spicy level', () => {
      const gameState = createMockGameState({ finalSpicyLevel: 'Hot' });
      const achievements = calculateAchievements(gameState);

      const braveSoul = achievements.find((a) => a.id === 'brave-soul');
      expect(braveSoul).toBeDefined();
      expect(braveSoul?.rarity).toBe('rare');
      expect(braveSoul?.name).toBe('Heat Seeker');
      expect(braveSoul?.description).toContain('temperature');
    });
    it('should award Brave Soul (legendary) for Extra-Hot spicy level', () => {
      const gameState = createMockGameState({ finalSpicyLevel: 'Extra-Hot' });
      const achievements = calculateAchievements(gameState);

      const braveSoul = achievements.find((a) => a.id === 'brave-soul');
      expect(braveSoul).toBeDefined();
      expect(braveSoul?.rarity).toBe('legendary');
      expect(braveSoul?.name).toBe('Fire Walker');
      expect(braveSoul?.description).toContain('flames');
    });
    it('should NOT award Brave Soul for Mild or Medium', () => {
      const gameState = createMockGameState({ finalSpicyLevel: 'Mild' });
      const achievements = calculateAchievements(gameState);

      const braveSoul = achievements.find((a) => a.id === 'brave-soul');
      expect(braveSoul).toBeUndefined();
    });

    it('should award Deep Diver to players who answered all questions', () => {
      const gameState = createMockGameState();
      const achievements = calculateAchievements(gameState);

      const deepDivers = achievements.filter((a) => a.id.startsWith('deep-diver'));
      expect(deepDivers).toHaveLength(2);
      expect(deepDivers[0].rarity).toBe('common');
    });

    it('should NOT award Deep Diver if player missed questions', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'Q1',
            answers: { 'player-1': 'A1', 'player-2': 'A2' },
          },
          {
            question: 'Q2',
            answers: { 'player-1': 'A1' }, // player-2 didn't answer
          },
        ],
      });
      const achievements = calculateAchievements(gameState);

      const player2DeepDiver = achievements.find((a) => a.id === 'deep-diver-player-2');
      expect(player2DeepDiver).toBeUndefined();
    });

    it('should award Vulnerability Champion to player with shortest average answer', () => {
      const gameState = createMockGameState();
      const achievements = calculateAchievements(gameState);

      const champion = achievements.find((a) => a.id === 'vulnerability-champion');
      expect(champion).toBeDefined();
      expect(champion?.playerId).toBe('player-2');
      expect(champion?.rarity).toBe('common');
    });

    it('should handle empty game rounds gracefully', () => {
      const gameState = createMockGameState({
        gameRounds: [],
      });

      expect(() => calculateAchievements(gameState)).not.toThrow();
      const achievements = calculateAchievements(gameState);
      expect(achievements).toHaveLength(0);
    });

    it('should handle single player game', () => {
      const gameState = createMockGameState({
        players: [
          {
            id: 'player-1',
            name: 'Alice',
            email: 'alice@example.com',
            isReady: false,
            selectedCategories: [],
          },
        ],
        gameRounds: [
          {
            question: 'Test?',
            answers: { 'player-1': 'Answer' },
          },
        ],
      });

      expect(() => calculateAchievements(gameState)).not.toThrow();
      const achievements = calculateAchievements(gameState);
      expect(achievements.length).toBeGreaterThan(0);
    });
  });

  describe('getPlayerName', () => {
    it('should return player name for valid player ID', () => {
      const gameState = createMockGameState();
      const name = getPlayerName(gameState, 'player-1');
      expect(name).toBe('Alice');
    });

    it('should return "Unknown" for invalid player ID', () => {
      const gameState = createMockGameState();
      const name = getPlayerName(gameState, 'nonexistent');
      expect(name).toBe('Unknown');
    });

    it('should handle empty players array', () => {
      const gameState = createMockGameState({ players: [] });
      const name = getPlayerName(gameState, 'player-1');
      expect(name).toBe('Unknown');
    });
  });

  describe('Secret Keeper achievement', () => {
    it('should award Vault Cracker when a player mentions secret keywords', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'Tell me something',
            answers: {
              'player-1': 'I have a secret that I have kept hidden.',
              'player-2': 'Nothing to share.',
            },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);
      const vaultCracker = achievements.find((a) => a.id === 'secret-keeper');
      expect(vaultCracker).toBeDefined();
      expect(vaultCracker?.playerId).toBe('player-1');
    });

    it('should NOT award Vault Cracker when no player mentions keywords', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'What do you enjoy?',
            answers: {
              'player-1': 'I enjoy reading books.',
              'player-2': 'Walking in nature.',
            },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);
      const vaultCracker = achievements.find((a) => a.id === 'secret-keeper');
      expect(vaultCracker).toBeUndefined();
    });
  });

  describe('Emoji Enthusiast achievement', () => {
    it('should award Visual Storyteller when a player uses 3+ emojis', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'How do you feel?',
            answers: {
              'player-1': 'I feel great! 🎉🎊🥳',
              'player-2': 'Good.',
            },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);
      const visualStoryteller = achievements.find((a) => a.id === 'emoji-enthusiast');
      expect(visualStoryteller).toBeDefined();
      expect(visualStoryteller?.playerId).toBe('player-1');
    });

    it('should NOT award Visual Storyteller when no player uses 3+ emojis', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'How do you feel?',
            answers: {
              'player-1': 'I feel great! 🎉',
              'player-2': 'Good.',
            },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);
      const visualStoryteller = achievements.find((a) => a.id === 'emoji-enthusiast');
      expect(visualStoryteller).toBeUndefined();
    });
  });

  describe('Question Mark Addict achievement', () => {
    it('should award Curious Cat when a player uses 5+ question marks', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'What do you think?',
            answers: {
              'player-1': 'Why? What do you mean? Is it important? Do you agree? Really?',
              'player-2': 'Not sure.',
            },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);
      const curiousCat = achievements.find((a) => a.id === 'question-mark-addict');
      expect(curiousCat).toBeDefined();
      expect(curiousCat?.playerId).toBe('player-1');
    });

    it('should NOT award Curious Cat when no player uses 5+ question marks', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'What do you think?',
            answers: {
              'player-1': 'Are you sure? Yes.',
              'player-2': 'Absolutely.',
            },
          },
        ],
      });
      const achievements = calculateAchievements(gameState);
      const curiousCat = achievements.find((a) => a.id === 'question-mark-addict');
      expect(curiousCat).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should return empty array when players is null/undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gameState = createMockGameState({ players: null as any });
      const achievements = calculateAchievements(gameState);
      expect(achievements).toHaveLength(0);
    });

    it('should not throw when a round has invalid answer type', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'Q1',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            answers: { 'player-1': 42 as any, 'player-2': 'Normal answer' },
          },
        ],
      });
      expect(() => calculateAchievements(gameState)).not.toThrow();
    });

    it('should not throw when a round is missing answers', () => {
      const gameState = createMockGameState({
        gameRounds: [
          {
            question: 'Q1',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            answers: null as any,
          },
        ],
      });
      expect(() => calculateAchievements(gameState)).not.toThrow();
    });
  });
});
