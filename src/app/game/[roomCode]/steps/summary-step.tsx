'use client';

import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Sheet, Stamp } from '@/components/dossier';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateAchievements, getPlayerName, type Achievement } from '@/lib/achievements';
import type { SummaryStepProps } from '@/lib/game-types';
import { cn } from '@/lib/utils';

import { LoadingScreen } from '../loading-screen';

export function SummaryStep({ gameState, me: _me, handlers }: SummaryStepProps) {
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
        title: 'Exhibit budget spent',
        description: 'Three paintings per file. Bureaucracy.',
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

        toast(
          result.isPlaceholder
            ? {
                title: 'The painter called in sick',
                description:
                  "The image service didn't answer, so you got a color study instead. Try again in a bit.",
              }
            : {
                title: 'Exhibit filed',
                description: 'A new painting is clipped to your debrief.',
              }
        );
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
    return <LoadingScreen message="Ember is writing up the debrief…" />;
  }

  const EXHIBIT = ['A', 'B', 'C'];

  return (
    <div className="w-full max-w-3xl">
      <Sheet form="Form WF-6 · Debrief" file={`Op. ${gameState.roomCode}`} clip>
        <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:justify-between">
          <div>
            <h2 className="font-typewriter text-2xl sm:text-3xl">The debrief</h2>
            <p className="mt-1 text-sm text-card-foreground/75">
              Case closed. Here&apos;s what Ember found, filed for both of you.
            </p>
          </div>
          <Stamp className="shrink-0 self-end text-lg sm:self-start sm:text-xl" tilt={8}>
            Case closed
          </Stamp>
        </div>

        <Tabs
          defaultValue="summary"
          className="mt-6 w-full"
          onValueChange={(value) => {
            // Load on any way of reaching the tab (click, keyboard, touch).
            if (value === 'therapist') void loadTherapistNotes();
          }}
        >
          <TabsList className="flex w-full justify-start">
            <TabsTrigger value="summary">Ember&apos;s report</TabsTrigger>
            <TabsTrigger value="achievements">Commendations</TabsTrigger>
            <TabsTrigger value="therapist">Dr. Ember&apos;s notes</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{summary}</div>

            <section className="mt-10" aria-labelledby="exhibits-heading">
              <div className="flex flex-col gap-3 border-t-2 border-dashed border-card-foreground/40 pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 id="exhibits-heading" className="font-typewriter text-lg">
                    Exhibits
                  </h3>
                  <p className="text-xs text-card-foreground/70">
                    Abstract art painted from your debrief. Never literal, never faces.
                  </p>
                </div>
                <Button
                  onClick={generateVisualMemory}
                  disabled={isGeneratingImage || remainingGenerations === 0}
                  size="sm"
                  variant="outline"
                  aria-label={`Generate Visual Memory (${remainingGenerations} left)`}
                  className="border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-wider hover:bg-card-foreground hover:text-card"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Developing…
                    </>
                  ) : remainingGenerations === 0 ? (
                    'Exhibit budget spent'
                  ) : (
                    <>Paint an exhibit ({remainingGenerations} left)</>
                  )}
                </Button>
              </div>

              {visualMemories.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
                  {visualMemories.map((memory, index) => (
                    <motion.figure
                      key={memory.timestamp}
                      initial={{ opacity: 0, y: 30, rotate: 0 }}
                      animate={{ opacity: 1, y: 0, rotate: index % 2 ? 1.5 : -1.5 }}
                      transition={{ delay: index * 0.15 }}
                      className="group relative bg-[hsl(45_30%_96%)] p-3 pb-4 shadow-[0_14px_28px_-12px_rgba(0,0,0,0.7)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={memory.imageUrl}
                        alt="Visual Memory"
                        className="aspect-square w-full object-cover"
                      />
                      <figcaption className="mt-3 font-typewriter text-[11px] leading-snug">
                        <span className="uppercase tracking-[0.2em]">
                          Exhibit {EXHIBIT[index] ?? index + 1}
                        </span>
                        <span className="mt-1 line-clamp-3 block text-card-foreground/70">
                          {memory.prompt}
                        </span>
                      </figcaption>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute right-4 top-4 opacity-80 transition-opacity group-hover:opacity-100"
                        aria-label="Download visual memory"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = memory.imageUrl;
                          const isSvg = memory.imageUrl.startsWith('data:image/svg+xml');
                          a.download = `exhibit-${memory.timestamp}.${isSvg ? 'svg' : 'jpg'}`;
                          // Remote images ignore `download` cross-origin; open them instead.
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          a.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </motion.figure>
                  ))}
                </div>
              ) : (
                <div className="mt-5 border-2 border-dashed border-card-foreground/30 py-8 text-center">
                  <p className="font-typewriter text-sm uppercase tracking-wider text-card-foreground/70">
                    No exhibits on file yet
                  </p>
                  <p className="mt-1 text-xs text-card-foreground/60">
                    Up to three per file. Shredded with the file after 24 hours.
                  </p>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <ul className="space-y-4">
              <AnimatePresence mode="popLayout">
                {achievements.map((achievement, index) => (
                  <motion.li
                    key={achievement.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.25, type: 'spring', stiffness: 120 }}
                    className={cn(
                      'relative flex items-start gap-4 border-2 p-4',
                      achievement.rarity === 'legendary'
                        ? 'legendary-glow border-primary'
                        : 'border-card-foreground/30'
                    )}
                  >
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-double text-3xl"
                      style={{ borderColor: achievement.color }}
                      aria-hidden="true"
                    >
                      {achievement.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-typewriter text-lg leading-tight">{achievement.name}</h3>
                      <p className="mt-1 text-sm text-card-foreground/80">
                        {achievement.description}
                      </p>
                      <p className="mt-2 font-typewriter text-[11px] uppercase tracking-[0.2em] text-card-foreground/60">
                        {achievement.rarity}
                        {achievement.playerId &&
                          ` · awarded to ${getPlayerName(gameState, achievement.playerId)}`}
                      </p>
                    </div>
                    {achievement.rarity === 'legendary' && (
                      <Stamp className="absolute -right-2 -top-3 bg-card text-xs" tilt={9}>
                        Legendary
                      </Stamp>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {achievements.length === 0 && (
              <p className="py-8 text-center font-typewriter text-sm uppercase tracking-wider text-card-foreground/70">
                No commendations this time. The board meets again next file.
              </p>
            )}
          </TabsContent>

          <TabsContent value="therapist" className="mt-6">
            {isLoadingNotes ? (
              <div className="flex flex-col items-center justify-center py-12" role="status">
                <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                <p className="font-typewriter text-sm uppercase tracking-wider text-card-foreground/70">
                  Dr. Ember is reviewing your file…
                </p>
              </div>
            ) : therapistNotes ? (
              <div className="space-y-4">
                <div className="border border-card-foreground/25 bg-[hsl(45_60%_94%)] shadow-inner">
                  <div className="flex items-center justify-between border-b-2 border-card-foreground/70 px-5 py-3">
                    <div>
                      <p className="font-typewriter text-sm uppercase tracking-[0.2em]">
                        Dr. Ember
                      </p>
                      <p className="text-[11px] uppercase tracking-wider text-card-foreground/60">
                        Clinical notes · privileged and confidential
                      </p>
                    </div>
                    <Stamp className="text-xs" blue tilt={6}>
                      Privileged
                    </Stamp>
                  </div>
                  <div className="ruled whitespace-pre-wrap px-5 py-3 font-sans text-[15px]">
                    {therapistNotes}
                  </div>
                </div>
                <Button
                  onClick={downloadNotes}
                  variant="outline"
                  className="w-full border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-wider"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Take a copy
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="mb-4 font-typewriter text-sm uppercase tracking-wider text-card-foreground/70">
                  Dr. Ember hasn&apos;t written yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-wider"
                  onClick={() => void loadTherapistNotes()}
                >
                  Ask Dr. Ember for notes
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 grid gap-3 border-t-2 border-dashed border-card-foreground/40 pt-5 sm:grid-cols-2">
          <Button
            onClick={() => router.push('/')}
            className="w-full font-typewriter uppercase tracking-widest"
            size="lg"
          >
            Open a new file
          </Button>
          <Button
            onClick={() => router.push('/profile')}
            variant="outline"
            className="w-full border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-widest"
            size="lg"
          >
            Past files
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
