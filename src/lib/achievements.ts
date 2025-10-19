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
      description: 'Shared the most detailed answers',
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
    const picassoId = Array.from(wordVariety.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    achievements.push({
      id: 'plot-twist-picasso',
      name: 'Plot-Twist Picasso',
      description: 'Most creative and varied responses',
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
      name: 'Wavelength Wizards',
      description: 'Completed a full session together',
      icon: '🌊',
      rarity: 'rare',
      color: '#4A90E2',
    });
  }

  // Brave Soul - Awarded if spicy level was Hot or Extra-Hot
  if (finalSpicyLevel === 'Hot' || finalSpicyLevel === 'Extra-Hot') {
    achievements.push({
      id: 'brave-soul',
      name: 'Brave Soul',
      description: `Ventured into ${finalSpicyLevel} territory`,
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
      name: 'Deep Diver',
      description: 'Answered every single question',
      icon: '🏊',
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
        name: 'Vulnerability Champion',
        description: 'Brave enough to be concise',
        icon: '🎯',
        playerId: shortestAvgId,
        rarity: 'common',
        color: '#4A90E2',
      });
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
