'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';

import { Logo } from '@/components/icons/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { GameState } from '@/lib/game-types';
import { cn } from '@/lib/utils';

type GameLayoutProps = {
  children: ReactNode;
  gameState: GameState;
  error: string | null;
};

const STEP_TITLES: Record<GameState['step'], string> = {
  lobby: 'Briefing room',
  categories: 'Lines of inquiry',
  spicy: 'Clearance',
  game: 'Interrogation',
  summary: 'Debrief',
};

export function GameLayout({ children, gameState, error }: GameLayoutProps) {
  const router = useRouter();
  const { step, players, currentQuestionIndex, totalQuestions, roomCode } = gameState;

  const pageLabel =
    step === 'game' && totalQuestions > 0
      ? `Question ${currentQuestionIndex} of ${totalQuestions}`
      : STEP_TITLES[step];

  const animationKey = `${step}-${step === 'game' ? currentQuestionIndex : '0'}`;

  return (
    <div className="relative flex min-h-screen flex-col items-center px-3 pb-10 pt-4 sm:px-6">
      <header className="mb-6 w-full max-w-4xl">
        <div className="flex items-center justify-between gap-3 border-b border-foreground/15 pb-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-left"
            aria-label="Back to the front desk"
          >
            <Logo className="h-9 w-9 shrink-0" />
            <span className="hidden font-typewriter text-[11px] uppercase leading-tight tracking-[0.2em] text-foreground/70 sm:block">
              Operation
              <br />
              <span className="text-foreground">{roomCode}</span>
            </span>
          </button>
          <div className="text-right font-typewriter text-[11px] uppercase leading-tight tracking-[0.2em] text-foreground/70">
            <span className="text-foreground">{pageLabel}</span>
            <br />
            <span aria-label={`${players.length} of 3 seats filled`}>
              Agents on file: {players.length}/3
            </span>
          </div>
        </div>
        <ol className="mt-3 flex gap-1" aria-label="Progress through the file">
          {(Object.keys(STEP_TITLES) as GameState['step'][]).map((s) => {
            const order = Object.keys(STEP_TITLES).indexOf(s);
            const current = Object.keys(STEP_TITLES).indexOf(step);
            return (
              <li
                key={s}
                aria-current={s === step ? 'step' : undefined}
                className={cn(
                  'h-1 flex-1 transition-colors duration-700',
                  order < current && 'bg-foreground/50',
                  order === current && 'bg-primary',
                  order > current && 'bg-foreground/10'
                )}
              >
                <span className="sr-only">{STEP_TITLES[s]}</span>
              </li>
            );
          })}
        </ol>
      </header>

      {error && (
        <Alert variant="destructive" className="paper mb-4 max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-typewriter uppercase tracking-wider">
            Transmission problem
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex w-full flex-grow items-start justify-center sm:items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={animationKey}
            initial={{ opacity: 0, y: 24, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 60, rotate: 2 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex w-full justify-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
