
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Wind, Sunrise, Flame, Zap, Sparkles } from 'lucide-react';
import { SPICY_LEVELS } from '@/lib/constants';
import type { StepProps, GameState, SpicyLevel } from '@/lib/game-types';
import { cn } from '@/lib/utils';
import { LoadingScreen } from '../loading-screen';

const spicyLevelIcons = {
  Mild: Wind,
  Medium: Sunrise,
  Hot: Flame,
  'Extra-Hot': Zap,
};

export function SpicyStep({ gameState, me, handlers }: StepProps) {
  const { roomRef, updateGameState, getDoc, setIsLoading, setError, generateQuestionAction, toast } = handlers;
  const { players } = gameState;
  const [selectedLevel, setSelectedLevel] = useState<SpicyLevel['name'] | undefined>(me.selectedSpicyLevel);

  const startFirstQuestion = async (level: SpicyLevel['name'], categories: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateQuestionAction({
          categories: [categories[0]],
          spicyLevel: level,
          previousQuestions: [],
      });

      if ('question' in result) {
          const resetPlayers = gameState.players.map(p => ({ ...p, isReady: false }));
          await updateGameState({ currentQuestion: result.question, step: 'game', currentQuestionIndex: 1, players: resetPlayers });
      } else {
          throw new Error(result.error);
      }
    } catch (e: any) {
        toast({ title: 'Error starting game', description: e.message, variant: 'destructive' });
        const unreadyPlayers = gameState.players.map(p => ({ ...p, isReady: false, selectedSpicyLevel: undefined }));
        await updateGameState({ players: unreadyPlayers });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSpicySelect = async (value: SpicyLevel['name']) => {
    if (me.isReady) return;
    setSelectedLevel(value);
    
    let currentGameState = (await getDoc(roomRef)).data() as GameState;
    
    const updatedPlayers = currentGameState.players.map(p => 
      p.id === me.id ? { ...p, selectedSpicyLevel: value, isReady: true } : p
    );
    
    await updateGameState({ players: updatedPlayers });
    currentGameState.players = updatedPlayers;

    const allReady = updatedPlayers.every(p => p.isReady);
    
    if (allReady) {
        const playerLevels = updatedPlayers.map(p => SPICY_LEVELS.findIndex(l => l.name === p.selectedSpicyLevel!));
        const finalLevelIndex = Math.min(...playerLevels);
        const finalLevel = SPICY_LEVELS[finalLevelIndex].name;

        await updateGameState({ finalSpicyLevel: finalLevel });
        await startFirstQuestion(finalLevel, currentGameState.commonCategories);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 10 } },
    hover: { scale: 1.03, translateY: -5, boxShadow: "0px 15px 25px hsla(var(--primary) / 0.15)", transition: { type: 'spring', stiffness: 300, damping: 15 } }
  };
  
  if (players.every(p => p.isReady)) {
      return <LoadingScreen message="Calculating your perfect game..." />;
  }

  return (
    <div className="w-full max-w-5xl text-center">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Set the Mood
        </h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-lg mx-auto">
            Choose your heat. The game will use the mildest level chosen by any player.
        </p>

        <motion.div 
            className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {SPICY_LEVELS.map((level) => {
              const Icon = spicyLevelIcons[level.name];
              const isSelectedByMe = selectedLevel === level.name;
              
              return (
                <motion.div
                    key={level.name}
                    variants={cardVariants}
                    whileHover={me.isReady ? '' : 'hover'}
                    onClick={() => handleSpicySelect(level.name)}
                    className={cn(
                        "group relative rounded-xl border-4 p-6 text-center cursor-pointer transition-all duration-300 ease-in-out overflow-hidden",
                        me.isReady && 'opacity-60 cursor-not-allowed',
                        isSelectedByMe ? 'border-primary bg-primary/10 shadow-2xl shadow-primary/20' : 'border-border bg-card'
                    )}
                >
                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div 
                            className={cn(
                                "flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors duration-300",
                                isSelectedByMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                            )}
                            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            animate={{ scale: isSelectedByMe ? 1.1 : 1 }}
                        >
                            <Icon className="w-8 h-8" />
                        </motion.div>
                        <h3 className="text-2xl font-bold">{level.name}</h3>
                        <p className="mt-2 text-muted-foreground text-sm h-12">{level.description}</p>
                    </div>

                    <AnimatePresence>
                    {isSelectedByMe && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground"
                        >
                            <Sparkles className="w-5 h-5" />
                        </motion.div>
                    )}
                    </AnimatePresence>
                </motion.div>
            )})}
        </motion.div>

        {me.isReady && (
          <div className="mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Waiting for other players to choose...</p>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 p-4 bg-secondary/50 rounded-lg max-w-2xl mx-auto'>
          {players.map(player => (
            <div key={player.id} className='text-center'>
              <p className='font-semibold'>{player.name}{player.id === me.id ? ' (You)' : ''}:</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={player.selectedSpicyLevel || 'Choosing...'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className='text-primary font-bold text-xl'
                >
                  {player.selectedSpicyLevel || 'Choosing...'}
                </motion.p>
              </AnimatePresence>
            </div>
          ))}
        </div>
    </div>
  );
}
