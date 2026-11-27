'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import { CLEARANCE, Sheet, Stamp } from '@/components/dossier';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SPICY_LEVELS } from '@/lib/constants';
import type { Player, SpicyLevel, SpicyStepProps } from '@/lib/game-types';
import { cn } from '@/lib/utils';

import { LoadingScreen } from '../loading-screen';

export function SpicyStep({ gameState, me, handlers }: SpicyStepProps) {
  const { updateGameState, generateQuestionAction, toast } = handlers;
  const { players } = gameState;
  const [selectedLevel, setSelectedLevel] = useState<SpicyLevel['name'] | undefined>(
    me.selectedSpicyLevel
  );
  const [chaosMode, setChaosMode] = useState(gameState.chaosMode || false);

  const startFirstQuestion = async (
    level: SpicyLevel['name'],
    categories: string[],
    currentPlayers: Player[]
  ) => {
    try {
      const result = await generateQuestionAction({
        categories: [categories[0]],
        spicyLevel: level,
        previousQuestions: [],
      });

      if ('question' in result) {
        const resetPlayers = currentPlayers.map((p) => ({ ...p, isReady: false }));
        await updateGameState({
          currentQuestion: result.question,
          step: 'game',
          currentQuestionIndex: 1,
          players: resetPlayers,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      toast({ title: 'Error starting game', description: errorMessage, variant: 'destructive' });
      const unreadyPlayers = currentPlayers.map((p) => ({
        ...p,
        isReady: false,
        selectedSpicyLevel: undefined,
      }));
      await updateGameState({ players: unreadyPlayers });
    }
  };

  const handleSpicySelect = async (value: SpicyLevel['name']) => {
    if (me.isReady) return;
    setSelectedLevel(value);

    const updatedPlayers = gameState.players.map((p) =>
      p.id === me.id ? { ...p, selectedSpicyLevel: value, isReady: true } : p
    );

    const saved = await updateGameState({ players: updatedPlayers, chaosMode });
    if (!saved || saved.step !== 'spicy') return;

    // Use the server's copy so a partner's just-made pick counts.
    const allReady = saved.players.every((p) => p.isReady && p.selectedSpicyLevel);

    if (allReady) {
      const playerLevels = saved.players.map((p) =>
        SPICY_LEVELS.findIndex((l) => l.name === p.selectedSpicyLevel!)
      );
      const finalLevelIndex = Math.min(...playerLevels);
      const finalLevel = SPICY_LEVELS[finalLevelIndex].name;

      await updateGameState({ finalSpicyLevel: finalLevel });
      await startFirstQuestion(finalLevel, saved.commonCategories, saved.players);
    }
  };

  const handleChaosToggle = async (checked: boolean) => {
    if (me.isReady) return;
    setChaosMode(checked);
    await updateGameState({ chaosMode: checked });
  };

  if (players.every((p) => p.isReady)) {
    return <LoadingScreen message="Clearance granted. Ember is typing your first question…" />;
  }

  return (
    <div className="w-full max-w-5xl">
      <Sheet form="Form WF-4 · Security clearance" file={`Op. ${gameState.roomCode}`}>
        <h2 className="font-typewriter text-2xl sm:text-3xl">Set your clearance</h2>
        <p className="mt-2 max-w-2xl text-sm text-card-foreground/75">
          How far in are you willing to go? The file opens at the <em>lowest</em> clearance any
          agent picks, so nobody gets dragged past their own line.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SPICY_LEVELS.map((level, index) => {
            const isSelectedByMe = selectedLevel === level.name;
            const clearance = CLEARANCE[level.name];
            return (
              <motion.div
                key={level.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                role="button"
                tabIndex={me.isReady ? -1 : 0}
                aria-pressed={isSelectedByMe}
                aria-disabled={me.isReady}
                aria-label={`${level.name} spice level`}
                onClick={() => handleSpicySelect(level.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleSpicySelect(level.name);
                  }
                }}
                className={cn(
                  'relative flex min-h-[11rem] cursor-pointer flex-col justify-between border-2 p-4 outline-none transition-all',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelectedByMe
                    ? 'border-primary bg-primary/10'
                    : 'border-card-foreground/30 hover:border-card-foreground/70',
                  me.isReady && !isSelectedByMe && 'cursor-not-allowed opacity-50'
                )}
                style={{ transform: `rotate(${[-0.8, 0.6, -0.4, 0.9][index]}deg)` }}
              >
                <div className="flex items-start justify-between">
                  <span className="font-stamp text-3xl leading-none text-card-foreground/25">
                    {clearance.code}
                  </span>
                  <span className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-card-foreground/55">
                    Level {index + 1} · {level.name}
                  </span>
                </div>
                <div>
                  <Stamp
                    className={cn('text-lg', !isSelectedByMe && 'opacity-60')}
                    tilt={isSelectedByMe ? -6 : 0}
                  >
                    {clearance.label}
                  </Stamp>
                  <p className="mt-3 text-[13px] leading-snug">{clearance.brief}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-3 border-2 border-dashed border-card-foreground/40 p-3">
          <Switch
            id="chaos-mode"
            checked={chaosMode}
            onCheckedChange={handleChaosToggle}
            disabled={me.isReady}
          />
          <Label
            htmlFor="chaos-mode"
            className={cn('cursor-pointer leading-snug', me.isReady && 'opacity-60')}
          >
            <span className="font-typewriter uppercase tracking-wider">Rogue handler</span>
            <span className="mt-1 block text-xs font-normal text-card-foreground/70">
              Ember may bump a question up one clearance level without warning. About one in five.
            </span>
          </Label>
        </div>

        <ul className="mt-6 grid gap-2 border-t-2 border-dashed border-card-foreground/40 pt-4 sm:grid-cols-3">
          {players.map((player) => (
            <li key={player.id} className="flex items-baseline justify-between gap-2">
              <span className="truncate font-hand text-2xl text-accent">{player.name}</span>
              <span className="font-typewriter text-xs uppercase tracking-wider">
                {player.selectedSpicyLevel
                  ? CLEARANCE[player.selectedSpicyLevel].label
                  : 'Deciding…'}
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
