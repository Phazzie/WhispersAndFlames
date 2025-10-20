import type { GameState } from './game-types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  playerId?: string;
  rarity: 'common' | 'rare' | 'legendary';
  color: string;
}

export function calculateAchievements(gameState: GameState): Achievement[] {
  const achievements: Achievement[] = [];

  try {
    const { players, gameRounds, finalSpicyLevel } = gameState;

    // Validate input
    if (!players || players.length === 0) {
      console.warn('[Achievements] No players found in game state');
      return achievements;
    }

    if (!gameRounds || gameRounds.length === 0) {
      console.warn('[Achievements] No game rounds found in game state');
      return achievements;
    }

    // Heart-Thrower - Player who gave the longest answer
    const answerLengths = new Map<string, number>();
    gameRounds.forEach((round) => {
      if (!round.answers) {
        console.warn('[Achievements] Round missing answers:', round);
        return;
      }
      Object.entries(round.answers).forEach(([playerId, answer]) => {
        if (typeof answer !== 'string') {
          console.warn('[Achievements] Invalid answer type for player:', playerId);
          return;
        }
        const currentLength = answerLengths.get(playerId) || 0;
        answerLengths.set(playerId, currentLength + answer.length);
      });
    });

    if (answerLengths.size > 0) {
      const heartThrowerId = Array.from(answerLengths.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];
      achievements.push({
        id: 'heart-thrower',
        name: 'Heart-Thrower',
        description:
          'Lobbed their heart into the ring and it stuck — brave, bright, and beautifully unignorable.',
        icon: '💖',
        playerId: heartThrowerId,
        rarity: 'rare',
        color: '#D46A4E',
      });
    }

    // Plot-Twist Picasso - Player with most unique/creative answers (heuristic: variety of words)
    const wordVariety = new Map<string, number>();
    gameRounds.forEach((round) => {
      if (!round.answers) return;
      Object.entries(round.answers).forEach(([playerId, answer]) => {
        if (typeof answer !== 'string') return;
        const words = new Set(answer.toLowerCase().split(/\s+/));
        const currentVariety = wordVariety.get(playerId) || 0;
        wordVariety.set(playerId, currentVariety + words.size);
      });
    });

    if (wordVariety.size > 0) {
      const picassoId = Array.from(wordVariety.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];
      achievements.push({
        id: 'plot-twist-picasso',
        name: 'Plot-Twist Picasso',
        description:
          'Painted the conversation with a left-field brushstroke — deliciously unpredictable.',
        icon: '🎨',
        playerId: picassoId,
        rarity: 'legendary',
        color: '#A93226',
      });
    }

    // Wavelength Wizards - All players (awarded for completing a session together)
    if (gameRounds.length >= 3) {
      achievements.push({
        id: 'wavelength-wizards',
        name: 'Telepathic Wink',
        description:
          "Finished each other's sentences like a psychic sitcom — eerie, delightful, and slightly illegal in three states.",
        icon: '😉',
        rarity: 'rare',
        color: '#4A90E2',
      });
    }

    // Brave Soul - Awarded if spicy level was Hot or Extra-Hot
    if (finalSpicyLevel === 'Hot' || finalSpicyLevel === 'Extra-Hot') {
      achievements.push({
        id: 'brave-soul',
        name: finalSpicyLevel === 'Extra-Hot' ? 'Fire Walker' : 'Heat Seeker',
        description:
          finalSpicyLevel === 'Extra-Hot'
            ? 'Danced with the flames and asked for the encore — absolutely fearless.'
            : 'Turned up the temperature and stayed cool under pressure.',
        icon: '🔥',
        rarity: finalSpicyLevel === 'Extra-Hot' ? 'legendary' : 'rare',
        color: finalSpicyLevel === 'Extra-Hot' ? '#A93226' : '#D46A4E',
      });
    }

    // Deep Diver - Player who answered every question (all players if everyone answered all)
    const fullAnswerers = players.filter((player) => {
      return gameRounds.every((round) => round.answers[player.id]);
    });

    fullAnswerers.forEach((player) => {
      achievements.push({
        id: `deep-diver-${player.id}`,
        name: 'Depth Charger',
        description:
          "Didn't just scratch the surface — brought scuba gear and snacks. Legendary commitment.",
        icon: '�',
        playerId: player.id,
        rarity: 'common',
        color: '#4A90E2',
      });
    });

    // Vulnerability Champion - Player with shortest average answer (being concise takes courage)
    const avgAnswerLengths = new Map<string, number>();
    gameRounds.forEach((round) => {
      if (!round.answers) return;
      Object.entries(round.answers).forEach(([playerId, answer]) => {
        if (typeof answer !== 'string') return;
        if (!avgAnswerLengths.has(playerId)) {
          avgAnswerLengths.set(playerId, 0);
        }
        const current = avgAnswerLengths.get(playerId)!;
        avgAnswerLengths.set(playerId, current + answer.length);
      });
    });

    if (avgAnswerLengths.size > 0 && gameRounds.length > 0) {
      avgAnswerLengths.forEach((total, playerId) => {
        const count = gameRounds.filter((r) =>
          Object.prototype.hasOwnProperty.call(r.answers, playerId)
        ).length;
        if (count > 0) {
          avgAnswerLengths.set(playerId, total / count);
        }
      });

      const shortestAvgId = Array.from(avgAnswerLengths.entries()).reduce((a, b) =>
        a[1] < b[1] ? a : b
      )[0];
      achievements.push({
        id: 'vulnerability-champion',
        name: 'Precision Poet',
        description: 'Said more with less — every word a calculated strike to the heart.',
        icon: '🎯',
        playerId: shortestAvgId,
        rarity: 'common',
        color: '#4A90E2',
      });
    }

    // Secret Keeper - Player who mentioned the word "secret" most
    const secretMentions = new Map<string, number>();
    gameRounds.forEach((round) => {
      if (!round.answers) return;
      Object.entries(round.answers).forEach(([playerId, answer]) => {
        if (typeof answer !== 'string') return;
        const secretCount = (answer.toLowerCase().match(/secret|hidden|private|whisper/g) || [])
          .length;
        const current = secretMentions.get(playerId) || 0;
        secretMentions.set(playerId, current + secretCount);
      });
    });

    if (secretMentions.size > 0) {
      const secretKeeperId = Array.from(secretMentions.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];
      if (secretMentions.get(secretKeeperId) && secretMentions.get(secretKeeperId)! > 0) {
        achievements.push({
          id: 'secret-keeper',
          name: 'Vault Cracker',
          description:
            'Specialized in unlocking what was meant to stay locked — deliciously dangerous.',
          icon: '🗝️',
          playerId: secretKeeperId,
          rarity: 'rare',
          color: '#A93226',
        });
      }
    }

    // Emoji Enthusiast - Player who used the most emojis
    const emojiCounts = new Map<string, number>();
    gameRounds.forEach((round) => {
      if (!round.answers) return;
      Object.entries(round.answers).forEach(([playerId, answer]) => {
        if (typeof answer !== 'string') return;
        const emojiCount = (
          answer.match(
            /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu
          ) || []
        ).length;
        const current = emojiCounts.get(playerId) || 0;
        emojiCounts.set(playerId, current + emojiCount);
      });
    });

    if (emojiCounts.size > 0) {
      const emojiEnthusiastId = Array.from(emojiCounts.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];
      if (emojiCounts.get(emojiEnthusiastId) && emojiCounts.get(emojiEnthusiastId)! >= 3) {
        achievements.push({
          id: 'emoji-enthusiast',
          name: 'Visual Storyteller',
          description: "Painted emotions in tiny pictures — when words weren't quite enough.",
          icon: '🎭',
          playerId: emojiEnthusiastId,
          rarity: 'common',
          color: '#D46A4E',
        });
      }
    }

    // Question Mark Addict - Player who asked the most questions back
    const questionCounts = new Map<string, number>();
    gameRounds.forEach((round) => {
      if (!round.answers) return;
      Object.entries(round.answers).forEach(([playerId, answer]) => {
        if (typeof answer !== 'string') return;
        const questionCount = (answer.match(/\?/g) || []).length;
        const current = questionCounts.get(playerId) || 0;
        questionCounts.set(playerId, current + questionCount);
      });
    });

    if (questionCounts.size > 0) {
      const questionerId = Array.from(questionCounts.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];
      if (questionCounts.get(questionerId) && questionCounts.get(questionerId)! >= 5) {
        achievements.push({
          id: 'question-mark-addict',
          name: 'Curious Cat',
          description:
            'Answered questions with more questions — beautifully, maddeningly inquisitive.',
          icon: '🐱',
          playerId: questionerId,
          rarity: 'rare',
          color: '#4A90E2',
        });
      }
    }

    console.log(`[Achievements] Calculated ${achievements.length} achievements`);
    return achievements;
  } catch (error) {
    console.error('[Achievements] Error calculating achievements:', error);
    return achievements; // Return empty or partial achievements on error
  }
}

export function getPlayerName(gameState: GameState, playerId: string): string {
  const player = gameState.players.find((p) => p.id === playerId);
  return player?.name || 'Unknown';
}
