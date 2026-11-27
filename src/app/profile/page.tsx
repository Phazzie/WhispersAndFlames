'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Sheet } from '@/components/dossier';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import type { GameState } from '@/lib/game-types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [games, setGames] = useState<GameState[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await fetch('/api/game/list', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to load games');
        }
        const data = await response.json();
        setGames(Array.isArray(data.games) ? data.games : []);
      } catch {
        setGames([]);
      } finally {
        setIsLoadingGames(false);
      }
    };

    if (isLoaded && user) {
      loadGames();
    }
  }, [isLoaded, user]);

  // Signed out: send them to the front desk (from an effect, not during render).
  useEffect(() => {
    if (isLoaded && !user) router.push('/');
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <p className="font-typewriter text-sm uppercase tracking-[0.3em] text-foreground/70 animate-pulse">
          Pulling your file…
        </p>
      </div>
    );
  }

  const STEP_LABELS: Record<GameState['step'], string> = {
    lobby: 'Briefing',
    categories: 'Picking files',
    spicy: 'Clearance',
    game: 'Interrogation',
    summary: 'Closed',
  };

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="Back to the front desk"
          >
            <Logo className="h-10 w-10" />
          </button>
          <div className="flex gap-4 font-typewriter text-xs uppercase tracking-widest text-foreground/80">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="underline decoration-dotted underline-offset-4 hover:text-foreground"
            >
              Front desk
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="underline decoration-dotted underline-offset-4 hover:text-foreground"
            >
              Clock out
            </button>
          </div>
        </div>

        <Sheet form="Personnel record" file="Restricted" clip>
          <h1 className="font-typewriter text-2xl sm:text-3xl">Past files</h1>
          <p className="mt-1 text-sm text-card-foreground/75">
            Agent on file: {user.emailAddresses[0]?.emailAddress || 'unknown'}. Files are shredded
            24 hours after they open.
          </p>

          <div className="mt-6">
            {isLoadingGames ? (
              <p className="py-8 text-center font-typewriter text-sm uppercase tracking-wider text-card-foreground/70">
                Checking the cabinet…
              </p>
            ) : games.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-typewriter text-sm uppercase tracking-wider text-card-foreground/70">
                  The cabinet is empty
                </p>
                <Button
                  className="mt-4 font-typewriter uppercase tracking-widest"
                  onClick={() => router.push('/')}
                >
                  Open a new file
                </Button>
              </div>
            ) : (
              <ul>
                {games.map((game) => (
                  <li
                    key={game.roomCode}
                    className="flex items-center justify-between gap-3 border-b border-dashed border-card-foreground/30 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-typewriter tracking-wider">Op. {game.roomCode}</p>
                      <p className="text-xs uppercase tracking-wider text-card-foreground/65">
                        {STEP_LABELS[game.step] ?? game.step} ·{' '}
                        {game.players.map((p) => p.name).join(' & ')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-wider"
                      onClick={() => router.push(`/game/${game.roomCode}`)}
                    >
                      {game.step === 'summary' ? 'Reread' : 'Resume'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Sheet>
      </div>
    </main>
  );
}
