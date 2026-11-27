'use client';

import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { Sheet, Stamp } from '@/components/dossier';
import { Button } from '@/components/ui/button';
import { CATEGORIES, QUESTIONS_PER_CATEGORY } from '@/lib/constants';
import type { StepProps } from '@/lib/game-types';
import { cn } from '@/lib/utils';

export function CategoriesStep({ gameState, me, handlers }: StepProps) {
  const { updateGameState, toast } = handlers;
  const { players } = gameState;

  // My picks live locally and are written in order. Computing each toggle
  // from `me` (the last server copy) dropped picks when someone tapped two
  // files quickly: the second write was built before the first came back.
  const [myPicks, setMyPicks] = useState<string[]>(me.selectedCategories || []);
  const myPicksRef = useRef<string[]>(me.selectedCategories || []);
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());

  const handleToggleCategory = async (categoryName: string) => {
    if (me.isReady) return;

    const current = myPicksRef.current;
    const next = current.includes(categoryName)
      ? current.filter((c) => c !== categoryName)
      : [...current, categoryName];
    myPicksRef.current = next;
    setMyPicks(next);

    writeChain.current = writeChain.current.then(() =>
      updateGameState({
        players: gameState.players.map((p) =>
          p.id === me.id ? { ...p, selectedCategories: myPicksRef.current } : p
        ),
      })
    );
    await writeChain.current;
  };

  const handlePlayerReady = async () => {
    // Player must select at least one category to be ready
    await writeChain.current;
    if (myPicksRef.current.length === 0) {
      toast({
        title: 'No files pulled',
        description: 'Pick at least one line of inquiry first.',
        variant: 'destructive',
      });
      return;
    }

    // Check if we have at least 2 players
    if (gameState.players.length < 2) {
      toast({
        title: 'Waiting for Players',
        description: 'You need at least 2 players to start the game.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    const updatedPlayers = gameState.players.map((p) =>
      p.id === me.id ? { ...p, isReady: true, selectedCategories: myPicksRef.current } : p
    );
    const saved = await updateGameState({ players: updatedPlayers });
    if (!saved || saved.step !== 'categories') return;

    // The game should only advance if ALL players are now ready. Use the
    // server's copy: a partner's latest picks and readiness may not have
    // reached our local state yet.
    const serverPlayers = saved.players;
    if (serverPlayers.every((p) => p.isReady)) {
      const allSelectedCategories = serverPlayers.map((p) => p.selectedCategories);
      const commonCategories = allSelectedCategories.reduce((a, b) =>
        a.filter((c) => b.includes(c))
      );

      if (commonCategories.length === 0) {
        toast({
          title: 'No common ground',
          description:
            "You didn't pull a single file in common. Talk it over (that's kind of the point) and pick again.",
          variant: 'destructive',
          duration: 8000,
        });
        // Un-ready all players so they can change their selections
        const unReadyPlayers = serverPlayers.map((p) => ({ ...p, isReady: false }));
        await updateGameState({ players: unReadyPlayers });
        return;
      }

      const totalQuestions = commonCategories.length * QUESTIONS_PER_CATEGORY;
      const resetPlayers = serverPlayers.map((p) => ({
        ...p,
        isReady: false,
        selectedSpicyLevel: undefined,
      }));
      await updateGameState({
        commonCategories,
        totalQuestions,
        step: 'spicy',
        players: resetPlayers,
      });
    }
  };

  const commonCount = CATEGORIES.filter(
    (cat) =>
      players.length > 1 &&
      players.every((p) => (p.id === me.id ? myPicks : p.selectedCategories)?.includes(cat.name))
  ).length;

  return (
    <div className="w-full max-w-5xl">
      <Sheet form="Form WF-3 · Lines of inquiry" file={`Op. ${gameState.roomCode}`}>
        <h2 className="font-typewriter text-2xl sm:text-3xl">Pull your files</h2>
        <p className="mt-2 max-w-2xl text-sm text-card-foreground/75">
          Pull the files you want opened. Ember only investigates the ones <em>every</em> agent
          pulls, two questions per file. Your partner&apos;s initials show up on the tabs as they
          pick.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((cat) => {
            const isSelectedByMe = myPicks.includes(cat.name);
            const selections = players.filter((p) =>
              (p.id === me.id ? myPicks : p.selectedCategories)?.includes(cat.name)
            );
            const isCommon = players.length > 1 && selections.length === players.length;

            return (
              <div
                key={cat.name}
                role="button"
                tabIndex={me.isReady ? -1 : 0}
                aria-pressed={isSelectedByMe}
                aria-disabled={me.isReady}
                aria-label={cat.name}
                onClick={() => handleToggleCategory(cat.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleToggleCategory(cat.name);
                  }
                }}
                className={cn(
                  'group relative cursor-pointer outline-none transition-transform duration-200',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelectedByMe ? '-translate-y-2' : 'hover:-translate-y-1',
                  me.isReady && 'cursor-not-allowed opacity-70'
                )}
              >
                {/* folder tab */}
                <div
                  className={cn(
                    'ml-2 inline-block rounded-t-sm px-2 pt-1 font-typewriter text-[10px] uppercase tracking-wider',
                    isSelectedByMe ? 'bg-[hsl(41_45%_62%)]' : 'bg-[hsl(41_30%_58%)]'
                  )}
                >
                  {selections.length > 0
                    ? selections.map((p) => p.name.slice(0, 1).toUpperCase()).join(' · ')
                    : 'File'}
                </div>
                <div
                  className={cn(
                    'relative flex min-h-[7.5rem] flex-col sm:aspect-[4/3] sm:min-h-0 justify-between overflow-hidden rounded-sm border p-3 shadow-[0_6px_14px_-6px_rgba(0,0,0,0.55)]',
                    isSelectedByMe
                      ? 'border-card-foreground/50 bg-[hsl(41_45%_62%)]'
                      : 'border-card-foreground/25 bg-[hsl(41_30%_66%)]'
                  )}
                >
                  <cat.icon className="h-5 w-5 opacity-70" aria-hidden="true" />
                  <div>
                    <h3 className="font-typewriter text-sm leading-tight">{cat.name}</h3>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-card-foreground/70">
                      {cat.description}
                    </p>
                  </div>
                  {isCommon && (
                    <Stamp className="absolute right-1 top-2 text-[11px] sm:text-xs" tilt={-14}>
                      Match
                    </Stamp>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t-2 border-dashed border-card-foreground/40 pt-5 sm:flex-row sm:justify-between">
          <p className="font-typewriter text-xs uppercase tracking-[0.2em] text-card-foreground/70">
            {commonCount === 0
              ? 'No shared files yet'
              : `${commonCount} shared file${commonCount === 1 ? '' : 's'} · ${
                  commonCount * QUESTIONS_PER_CATEGORY
                } questions`}
          </p>
          <Button
            onClick={handlePlayerReady}
            className="w-full font-typewriter uppercase tracking-widest sm:w-auto"
            size="lg"
            disabled={me.isReady}
            aria-label={me.isReady ? 'Waiting for others' : 'Confirm Selections'}
          >
            {me.isReady ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting on the others…
              </>
            ) : (
              'Seal my picks'
            )}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
