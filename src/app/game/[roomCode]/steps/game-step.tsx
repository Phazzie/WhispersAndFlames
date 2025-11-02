'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QUESTIONS_PER_CATEGORY } from '@/lib/constants';
import type { StepProps } from '@/lib/game-types';
import { applyChaosMode } from '@/lib/game-utils';

import { LoadingScreen } from '../loading-screen';

export function GamePlayStep({ gameState, me, handlers }: StepProps) {
  const {
    updateGameState,
    setIsLoading,
    setError,
    generateQuestionAction,
    analyzeAndSummarizeAction,
    toast,
  } = handlers;
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

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast({ title: "Answer can't be empty", variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
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

      await updateGameState({ gameRounds: updatedGameRounds });
      setCurrentAnswer('');
    } catch (e) {
      console.error(e);
      setError('There was an issue submitting your answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = async () => {
    setIsLoading(true);

    const updatedPlayers = gameState.players.map((p) =>
      p.id === me.id ? { ...p, isReady: true } : p
    );
    await updateGameState({ players: updatedPlayers });

    if (updatedPlayers.every((p) => p.isReady)) {
      const resetPlayers = updatedPlayers.map((p) => ({ ...p, isReady: false }));

      if (gameState.currentQuestionIndex >= gameState.totalQuestions) {
        // --- GAME OVER ---
        await updateGameState({ step: 'summary', players: resetPlayers });

        try {
          const summaryResult = await analyzeAndSummarizeAction({
            questions: gameState.gameRounds.map((r) => r.question),
            answers: gameState.gameRounds.flatMap((r) => Object.values(r.answers)),
            categories: gameState.commonCategories,
            spicyLevel: gameState.finalSpicyLevel,
            playerCount: gameState.players.length,
          });

          if ('summary' in summaryResult) {
            await updateGameState({
              summary: summaryResult.summary,
              completedAt: new Date(),
            });
          } else {
            setError(summaryResult.error);
            await updateGameState({ step: 'game' }); // Go back if summary fails
          }
        } catch (e: any) {
          setError(e.message || 'Could not generate summary.');
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
            categories: [gameState.commonCategories[categoryIndex]],
            spicyLevel: chaosResult.level,
            previousQuestions: gameState.gameRounds.map((r) => r.question),
          });

          if ('question' in result) {
            await updateGameState({
              players: resetPlayers,
              currentQuestion: result.question,
              currentQuestionIndex: nextQuestionIndex,
            });
          } else {
            setError(result.error);
          }
        } catch (e: any) {
          setError(e.message || 'Could not generate next question.');
        }
      }
    }
    setIsLoading(false);
  };

  if (isSubmitting) {
    return <LoadingScreen message="Submitting your answer..." />;
  }

  if (allPlayersAnswered) {
    const readyPlayerCount = players.filter((p) => p.isReady).length;
    return (
      <div className="w-full max-w-4xl">
        <p className="text-center text-primary font-semibold mb-4">
          Question {currentQuestionIndex} of {totalQuestions}
        </p>
        <Card>
          <CardHeader>
            <blockquote className="text-center text-2xl font-semibold leading-relaxed">
              “{currentQuestion}”
            </blockquote>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {players.map((player) => (
                <div key={player.id} className="space-y-2">
                  <Label className="font-semibold text-base">{player.name}&apos;s Answer:</Label>
                  <p className="p-4 bg-secondary rounded-md whitespace-pre-wrap h-full">
                    {currentRound.answers[player.id]}
                  </p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleNextStep}
              className="w-full mt-6"
              size="lg"
              disabled={me.isReady}
            >
              {me.isReady ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : currentQuestionIndex >= totalQuestions ? (
                'See Summary'
              ) : (
                'Next Question'
              )}
              {!me.isReady && currentQuestionIndex < totalQuestions && (
                <ArrowRight className="ml-2" />
              )}
            </Button>

            {me.isReady && readyPlayerCount < players.length && (
              <p className="text-center text-sm text-muted-foreground mt-2 animate-pulse">
                Waiting for {players.length - readyPlayerCount} more player
                {players.length - readyPlayerCount > 1 ? 's' : ''}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl relative">
      <AnimatePresence>
        {chaosUpgraded && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="absolute top-4 right-4 bg-accent text-white px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Chaos! Spicy level upgraded
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-center text-primary font-semibold mb-4">
        Question {currentQuestionIndex} of {totalQuestions}
      </p>
      <Card>
        <CardContent className="p-6">
          <blockquote className="text-center text-2xl font-semibold leading-relaxed mb-6">
            “{currentQuestion}”
          </blockquote>
          <Textarea
            placeholder="Your answer..."
            rows={5}
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="text-base"
            disabled={!!myAnswer}
          />
          <Button
            onClick={handleSubmitAnswer}
            className="w-full mt-6"
            size="lg"
            disabled={!currentAnswer.trim() || !!myAnswer}
          >
            {myAnswer ? 'Waiting for other players...' : 'Submit Answer'}
          </Button>

          {myAnswer && !allPlayersAnswered && (
            <p className="text-center text-muted-foreground text-sm mt-4 animate-pulse">
              Waiting for other players to answer...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
