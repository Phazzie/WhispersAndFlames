'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { Loader2, Home, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameState } from '@/lib/game-types';
import { logger } from '@/lib/utils/logger';

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
      logger.error('Failed to sign out', error instanceof Error ? error : new Error(String(error)));
    }
  };

  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await fetch('/api/game/list', { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to load games: ${response.statusText}`);
        }
        const data = await response.json();
        setGames(Array.isArray(data.games) ? data.games : []);
      } catch (error) {
        logger.error(
          'Failed to load game history',
          error instanceof Error ? error : new Error(String(error))
        );
        setGames([]);
      } finally {
        setIsLoadingGames(false);
      }
    };

    if (isLoaded && user) {
      loadGames();
    }
  }, [isLoaded, user]);

  // Wait for Clerk to load
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <Logo className="h-8 w-8" />
          <div className="flex gap-2">
            <Button onClick={() => router.push('/')} variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button onClick={handleSignOut} variant="ghost">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.emailAddresses[0]?.emailAddress || 'No email'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs">{user.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Game History</CardTitle>
            <CardDescription>Your past and ongoing games</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGames ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : games.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No games found yet.</p>
            ) : (
              <div className="space-y-3">
                {games.map((game) => (
                  <div
                    key={game.roomCode}
                    className="rounded-lg border p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{game.roomCode}</p>
                      <p className="text-sm text-muted-foreground">
                        Step: {game.step} · Players: {game.players.length}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/game/${game.roomCode}`)}
                    >
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
