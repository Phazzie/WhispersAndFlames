'use client';

import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, Download, Loader2, Trophy, PartyPopper } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateAchievements, getPlayerName, type Achievement } from '@/lib/achievements';
import type { StepProps } from '@/lib/game-types';
import { cn } from '@/lib/utils';

import { LoadingScreen } from '../loading-screen';

export function SummaryStep({ gameState, me: _me, handlers }: StepProps) {
  const { summary } = gameState;
  const {
    router,
    generateTherapistNotesAction,
    generateVisualMemoryAction,
    updateGameState,
    toast,
  } = handlers;
  const [therapistNotes, setTherapistNotes] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsRevealed, setAchievementsRevealed] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const visualMemories = gameState.visualMemories || [];
  const imageGenerationCount = gameState.imageGenerationCount || 0;
  const remainingGenerations = Math.max(0, 3 - imageGenerationCount);

  useEffect(() => {
    if (summary && !achievementsRevealed) {
      // Calculate achievements when summary is available
      const calculatedAchievements = calculateAchievements(gameState);
      setAchievements(calculatedAchievements);
      setAchievementsRevealed(true);

      // Fire confetti for legendary achievements
      const legendaryCount = calculatedAchievements.filter((a) => a.rarity === 'legendary').length;
      if (legendaryCount > 0) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#A93226', '#D46A4E', '#FFD700'],
          });
        }, 500);
      }
    }
  }, [summary, achievementsRevealed, gameState]);

  const loadTherapistNotes = async () => {
    if (therapistNotes) return; // Already loaded

    setIsLoadingNotes(true);
    try {
      const result = await generateTherapistNotesAction({
        questions: gameState.gameRounds.map((r) => r.question),
        answers: gameState.gameRounds.flatMap((r) => Object.values(r.answers)),
        categories: gameState.commonCategories,
        spicyLevel: gameState.finalSpicyLevel,
        playerCount: gameState.players.length,
      });

      if ('notes' in result) {
        setTherapistNotes(result.notes);
      } else {
        toast({
          title: 'Failed to generate notes',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Could not generate therapist notes';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const downloadNotes = () => {
    if (!therapistNotes) return;

    const blob = new Blob([therapistNotes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dr-ember-notes-${gameState.roomCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateVisualMemory = async () => {
    if (imageGenerationCount >= 3) {
      toast({
        title: 'Limit Reached',
        description: 'You can generate up to 3 visual memories per session.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Extract themes from summary and categories
      const sharedThemes = gameState.commonCategories;

      const result = await generateVisualMemoryAction(
        gameState.summary,
        gameState.finalSpicyLevel,
        sharedThemes
      );

      if ('imageUrl' in result) {
        const newMemory = {
          imageUrl: result.imageUrl,
          prompt: result.prompt,
          timestamp: Date.now(),
        };

        await updateGameState({
          visualMemories: [...visualMemories, newMemory],
          imageGenerationCount: imageGenerationCount + 1,
        });

        toast({
          title: 'Visual Memory Created',
          description: 'Your artistic memory has been generated!',
        });
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Could not generate visual memory';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!summary) {
    return <LoadingScreen message="Ember is analyzing your answers..." />;
  }

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader className="items-center text-center">
          <PartyPopper className="w-12 h-12 text-primary mb-2" />
          <CardTitle className="text-3xl">Your Session Summary</CardTitle>
          <CardDescription>A little insight from your conversation.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Playful Summary</TabsTrigger>
              <TabsTrigger value="achievements">
                <Trophy className="w-4 h-4 mr-2" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="therapist" onClick={loadTherapistNotes}>
                Dr. Ember&apos;s Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-6">
              <div className="prose prose-invert prose-p:text-foreground/90 prose-headings:text-primary max-w-none text-base whitespace-pre-wrap p-4 bg-secondary rounded-md">
                {summary}
              </div>

              {/* Visual Memories Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Visual Memories</h3>
                  <Button
                    onClick={generateVisualMemory}
                    disabled={isGeneratingImage || remainingGenerations === 0}
                    size="sm"
                    variant="outline"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Visual Memory ({remainingGenerations} left)</>
                    )}
                  </Button>
                </div>

                {visualMemories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visualMemories.map((memory, index) => (
                      <motion.div
                        key={memory.timestamp}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.2 }}
                        className="relative group rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={memory.imageUrl}
                          alt="Visual Memory"
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                          <p className="text-white text-sm line-clamp-2">{memory.prompt}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = memory.imageUrl;
                            a.download = `visual-memory-${memory.timestamp}.svg`;
                            a.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">
                      Generate artistic visual memories of your session
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      (Ephemeral - will expire with session)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="achievements" className="mt-6">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.3, type: 'spring', stiffness: 100 }}
                      className={cn(
                        'relative rounded-lg border-2 p-6 bg-card overflow-hidden',
                        achievement.rarity === 'legendary' && 'legendary-glow border-accent',
                        achievement.rarity === 'rare' && 'border-primary',
                        achievement.rarity === 'common' && 'border-border'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-6xl flex-shrink-0">{achievement.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold mb-1">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={achievement.rarity === 'legendary' ? 'default' : 'outline'}
                              style={{
                                backgroundColor:
                                  achievement.rarity === 'legendary'
                                    ? achievement.color
                                    : 'transparent',
                                borderColor: achievement.color,
                                color:
                                  achievement.rarity === 'legendary' ? 'white' : achievement.color,
                              }}
                            >
                              {achievement.rarity}
                            </Badge>
                            {achievement.playerId && (
                              <Badge variant="secondary">
                                {getPlayerName(gameState, achievement.playerId)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {achievements.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No achievements yet. Complete a session to earn them!
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="therapist" className="mt-6">
              {isLoadingNotes ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Dr. Ember is reviewing your session...</p>
                </div>
              ) : therapistNotes ? (
                <div className="space-y-4">
                  <div
                    className="bg-white text-black p-6 rounded-md font-mono text-sm whitespace-pre-wrap"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, transparent, transparent 24px, #e5e7eb 24px, #e5e7eb 25px)',
                      lineHeight: '25px',
                    }}
                  >
                    {therapistNotes}
                  </div>
                  <Button onClick={downloadNotes} variant="outline" className="w-full" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Notes
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clipboard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click the tab to load notes</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <Button onClick={() => router.push('/profile')} className="w-full mt-6" size="lg">
            View My History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
