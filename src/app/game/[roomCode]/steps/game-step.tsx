'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { FieldLabel, Redacted, Sheet, Stamp } from '@/components/dossier';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { QUESTIONS_PER_CATEGORY } from '@/lib/constants';
import type { GameStepProps } from '@/lib/game-types';
import { applyChaosMode } from '@/lib/game-utils';
import { cn } from '@/lib/utils';

import { LoadingScreen } from '../loading-screen';

export function GamePlayStep({ gameState, me, handlers }: GameStepProps) {
  const { updateGameState, generateQuestionAction, analyzeAndSummarizeAction, toast } = handlers;
  const { players, currentQuestion, gameRounds, totalQuestions, currentQuestionIndex } = gameState;

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chaosUpgraded, setChaosUpgraded] = useState(false);

  useEffect(() => {
    if (chaosUpgraded) {
      const timer = setTimeout(() => {
        setChaosUpgraded(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [chaosUpgraded]);

  const currentRound = gameRounds.find((r) => r.question === currentQuestion);
  const myAnswer = currentRound?.answers[me.id];
  const allPlayersAnswered =
    currentRound && Object.keys(currentRound.answers).length === players.length;

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentAnswer.trim()) {
      toast({
        title: 'Blank statement',
        description: 'Ember needs at least a sentence.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Optimistic read-modify-write with race condition handling
      // This reads the latest state from the server before updating
      const updatedGameRounds = [...gameState.gameRounds];
      const currentRoundIndexInState = updatedGameRounds.findIndex(
        (r) => r.question === gameState.currentQuestion
      );

      if (currentRoundIndexInState > -1) {
        updatedGameRounds[currentRoundIndexInState].answers[me.id] = currentAnswer;
      } else {
        updatedGameRounds.push({
          question: gameState.currentQuestion,
          answers: { [me.id]: currentAnswer },
        });
      }

      // Only discard what they typed once it is actually stored. The update
      // helper toasts failures rather than throwing, so clearing unconditionally
      // silently destroyed the answer on every failed submit.
      const persisted = await updateGameState({ gameRounds: updatedGameRounds });
      if (persisted) {
        setCurrentAnswer('');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      toast({
        title: 'Failed to submit answer',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentAnswer,
    gameState.gameRounds,
    gameState.currentQuestion,
    me.id,
    updateGameState,
    toast,
  ]);

  const handleNextStep = useCallback(async () => {
    try {
      // Mark current player as ready
      const updatedPlayers = gameState.players.map((p) =>
        p.id === me.id ? { ...p, isReady: true } : p
      );
      const saved = await updateGameState({ players: updatedPlayers });
      if (!saved || saved.step !== 'game') return;
      // Someone else already moved us on to another question.
      if (saved.currentQuestionIndex !== gameState.currentQuestionIndex) return;

      // Check readiness on the server's copy: a partner who clicked a moment
      // ago may still show as not ready locally, and then nobody advances.
      if (saved.players.every((p) => p.isReady)) {
        const resetPlayers = saved.players.map((p) => ({ ...p, isReady: false }));

        if (saved.currentQuestionIndex >= saved.totalQuestions) {
          // --- GAME OVER ---
          await updateGameState({ step: 'summary', players: resetPlayers });

          try {
            const summaryResult = await analyzeAndSummarizeAction({
              questions: saved.gameRounds.map((r) => r.question),
              answers: saved.gameRounds
                .flatMap((r) => Object.values(r.answers))
                .filter((a) => typeof a === 'string' && a.trim().length > 0),
              categories: gameState.commonCategories,
              spicyLevel: gameState.finalSpicyLevel,
              playerCount: gameState.players.length,
            });

            if ('summary' in summaryResult) {
              await updateGameState({
                summary: summaryResult.summary,
                completedAt: new Date().toISOString(),
              });
            } else {
              toast({
                title: 'Summary generation failed',
                description: summaryResult.error,
                variant: 'destructive',
              });
              await updateGameState({ step: 'game' }); // Go back if summary fails
            }
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Could not generate summary.';
            toast({
              title: 'Summary generation error',
              description: errorMessage,
              variant: 'destructive',
            });
            await updateGameState({ step: 'game' });
          }
        } else {
          // --- NEXT QUESTION ---
          try {
            const nextQuestionIndex = gameState.currentQuestionIndex + 1;
            const categoryIndex = Math.floor((nextQuestionIndex - 1) / QUESTIONS_PER_CATEGORY);

            // Apply chaos mode if enabled
            const chaosResult = applyChaosMode(gameState.finalSpicyLevel, gameState.chaosMode);

            if (chaosResult.wasUpgraded) {
              setChaosUpgraded(true);
            }

            const result = await generateQuestionAction({
              categories: [saved.commonCategories[categoryIndex]],
              spicyLevel: chaosResult.level,
              previousQuestions: saved.gameRounds.map((r) => r.question),
            });

            if ('question' in result) {
              await updateGameState({
                players: resetPlayers,
                currentQuestion: result.question,
                currentQuestionIndex: nextQuestionIndex,
              });
            } else {
              toast({
                title: 'Question generation failed',
                description: result.error,
                variant: 'destructive',
              });
              // Un-ready everyone so the button comes back and they can retry.
              await updateGameState({ players: resetPlayers });
            }
          } catch (e: unknown) {
            const errorMessage =
              e instanceof Error ? e.message : 'Could not generate next question.';
            toast({
              title: 'Question generation error',
              description: errorMessage,
              variant: 'destructive',
            });
          }
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      toast({
        title: 'Unexpected error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [
    gameState.players,
    gameState.currentQuestionIndex,
    gameState.commonCategories,
    gameState.finalSpicyLevel,
    gameState.chaosMode,
    me.id,
    updateGameState,
    analyzeAndSummarizeAction,
    generateQuestionAction,
    toast,
  ]);

  if (isSubmitting) {
    return <LoadingScreen message="Sealing your statement in an envelope…" />;
  }

  const questionBlock = (
    <>
      <p className="font-typewriter text-[11px] uppercase tracking-[0.25em] text-card-foreground/70">
        Question {currentQuestionIndex} of {totalQuestions} · Ember asks:
      </p>
      <blockquote className="mt-3 font-typewriter text-xl leading-snug sm:text-2xl">
        {currentQuestion}
      </blockquote>
    </>
  );

  if (allPlayersAnswered) {
    const readyPlayerCount = players.filter((p) => p.isReady).length;
    const isLast = currentQuestionIndex >= totalQuestions;
    return (
      <div className="w-full max-w-4xl">
        <Sheet form="Form WF-5 · Statements" file={`Op. ${gameState.roomCode}`}>
          {questionBlock}

          <div
            className={cn(
              'mt-7 grid grid-cols-1 gap-5',
              players.length >= 3 ? 'md:grid-cols-3' : players.length === 2 && 'md:grid-cols-2'
            )}
          >
            {players.map((player, index) => (
              <motion.figure
                key={player.id}
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: index % 2 ? 0.8 : -0.8 }}
                transition={{ delay: 0.15 + index * 0.25 }}
                className="relative border border-card-foreground/25 bg-[hsl(45_60%_92%)] px-4 pb-4 pt-3 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]"
              >
                <figcaption className="font-typewriter text-[11px] uppercase tracking-[0.2em] text-card-foreground/60">
                  Statement of agent <span className="normal-case">{player.name}</span>
                </figcaption>
                <p className="ruled mt-1 whitespace-pre-wrap font-hand text-2xl text-accent">
                  {currentRound.answers[player.id]}
                </p>
                <motion.span
                  initial={{ scale: 2.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.25, type: 'spring', stiffness: 260 }}
                  className="absolute -right-2 -top-3"
                  aria-hidden="true"
                >
                  <Stamp className="text-xs sm:text-sm" tilt={-11}>
                    Declassified
                  </Stamp>
                </motion.span>
              </motion.figure>
            ))}
          </div>

          <Button
            onClick={handleNextStep}
            className="mt-8 w-full font-typewriter uppercase tracking-widest"
            size="lg"
            disabled={me.isReady}
            aria-label={
              me.isReady
                ? 'Waiting for other players'
                : isLast
                  ? 'View game summary'
                  : 'Proceed to next question'
            }
            aria-live="polite"
          >
            {me.isReady ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Waiting on the others…
              </>
            ) : isLast ? (
              'Close the file. Debrief us.'
            ) : (
              <>
                Next question
                <ArrowRight className="ml-2" aria-hidden="true" />
              </>
            )}
          </Button>

          {me.isReady && readyPlayerCount < players.length && (
            <p className="mt-3 text-center font-typewriter text-xs uppercase tracking-wider text-card-foreground/70">
              Waiting for {players.length - readyPlayerCount} more agent
              {players.length - readyPlayerCount > 1 ? 's' : ''}…
            </p>
          )}
        </Sheet>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl">
      <AnimatePresence>
        {chaosUpgraded && (
          <motion.div
            initial={{ scale: 2, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-4 right-2 z-10"
            role="status"
          >
            <Stamp className="bg-card text-base">Rogue handler: clearance raised</Stamp>
          </motion.div>
        )}
      </AnimatePresence>
      <Sheet form="Form WF-5 · Interrogation" file={`Op. ${gameState.roomCode}`} clip>
        {questionBlock}

        <div className="mt-6">
          <FieldLabel htmlFor="statement">
            {myAnswer ? 'Your statement is sealed' : 'Your statement (only Ember sees it, for now)'}
          </FieldLabel>
          <Textarea
            id="statement"
            placeholder="Be specific. Ember can tell."
            rows={5}
            value={myAnswer ?? currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className={cn(
              'ruled mt-2 resize-none rounded-none border-0 border-l-4 border-primary/40 bg-[hsl(45_60%_92%)] px-4 py-0 font-hand text-2xl text-accent shadow-inner focus-visible:ring-1',
              myAnswer && 'blur-[3px]'
            )}
            disabled={!!myAnswer}
            aria-label="Your answer to the current question"
            aria-required="true"
          />
        </div>
        <Button
          onClick={handleSubmitAnswer}
          className="mt-5 w-full font-typewriter uppercase tracking-widest"
          size="lg"
          disabled={!currentAnswer.trim() || !!myAnswer}
          aria-label={myAnswer ? 'Waiting for other players' : 'Submit your answer'}
        >
          {myAnswer ? 'Sealed. Waiting on the others…' : 'Seal my statement'}
        </Button>

        <ul className="mt-6 space-y-2 border-t-2 border-dashed border-card-foreground/40 pt-4">
          {players
            .filter((p) => p.id !== me.id)
            .map((p) => {
              const answered = !!currentRound?.answers[p.id];
              return (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="font-typewriter text-xs uppercase tracking-wider">
                    Agent <span className="normal-case">{p.name}</span>
                  </span>
                  {answered ? (
                    <span className="flex items-center gap-2">
                      <Redacted length={30} label={`${p.name}'s statement, sealed`} />
                    </span>
                  ) : (
                    <span className="font-typewriter text-xs uppercase tracking-wider text-card-foreground/60 animate-pulse">
                      Hasn&apos;t talked yet
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
      </Sheet>
    </div>
  );
}
