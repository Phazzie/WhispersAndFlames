
'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import type { GameState } from '@/lib/game-types';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Users } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';

type GameLayoutProps = {
  children: ReactNode;
  gameState: GameState;
  error: string | null;
};

const backgroundColors = {
  lobby: 'bg-gradient-to-br from-background to-blue-950/30',
  categories: 'bg-gradient-to-br from-background to-purple-950/30',
  spicy: 'bg-gradient-to-br from-background to-amber-950/30',
  game: 'bg-gradient-to-br from-background to-red-950/40',
  summary: 'bg-gradient-to-br from-background to-emerald-950/30',
};

export function GameLayout({ children, gameState, error }: GameLayoutProps) {
  const router = useRouter();
  const { step, players, currentQuestionIndex, totalQuestions } = gameState;

  const progress = (() => {
    if (!gameState) return 0;
    if (step === 'summary') return 100;
    if (step === 'game' && totalQuestions > 0) return ((currentQuestionIndex) / totalQuestions) * 100;
    if (step === 'spicy') return 20;
    if (step === 'categories') return 10;
    return 0;
  })();

  const animationKey = `${step}-${(step === 'game' && 'currentQuestionIndex' in gameState) ? gameState.currentQuestionIndex : '0'}`;
  
  const bgClass = backgroundColors[step] || 'bg-background';

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 relative transition-colors duration-1000", bgClass)}>
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Logo className="w-10 h-10 text-primary cursor-pointer" onClick={() => router.push('/')} />
          <div className="flex items-center gap-4">
            {players.length > 1 && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-5 h-5" />
                <span>{players.length} / 2</span>
              </div>
            )}
            {step !== 'lobby' && <Progress value={progress} className="w-32 sm:w-64" />}
          </div>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-grow flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={animationKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
