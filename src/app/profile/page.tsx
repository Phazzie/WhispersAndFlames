'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Home, Frown, Play, LogOut } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import type { Player, GameState, GameStep } from '@/lib/game-types';
import { useToast } from '@/hooks/use-toast';

type GameSession = {
  id: string;
  participants: Player[];
  summary?: string;
  completedAt?: Date;
  step: GameStep;
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<GameSession[]>([]);
  const [inProgress, setInProgress] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(
    async (uid: string) => {
      setLoading(true);
      try {
        const gamesRef = collection(db, 'games');

        // Query for completed games
        const historyQuery = query(
          gamesRef,
          where('playerIds', 'array-contains', uid),
          where('step', '==', 'summary'),
          orderBy('completedAt', 'desc'),
          limit(50)
        );

        // Query for in-progress games
        const inProgressQuery = query(
          gamesRef,
          where('playerIds', 'array-contains', uid),
          where('step', '!=', 'summary'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const [historySnapshot, inProgressSnapshot] = await Promise.all([
          getDocs(historyQuery),
          getDocs(inProgressQuery),
        ]);

        const mapDocToGameSession = (doc: any): GameSession => {
          const gameData = doc.data() as GameState & {
            completedAt?: Timestamp;
            createdAt?: Timestamp;
          };

          const completedAt =
            gameData.completedAt instanceof Timestamp ? gameData.completedAt.toDate() : undefined;

          return {
            id: doc.id,
            completedAt: completedAt,
            participants: gameData.players,
            summary: gameData.summary,
            step: gameData.step as GameStep,
          };
        };

        setHistory(historySnapshot.docs.map(mapDocToGameSession));
        setInProgress(inProgressSnapshot.docs.map(mapDocToGameSession));
      } catch (error) {
        console.error('Error fetching game history:', error);
        toast({
          title: 'Error',
          description: 'Could not fetch your game history.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchGames(currentUser.uid);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router, fetchGames]);

  const handleLogout = async () => {
    await signOut(auth);
    toast({ title: 'Logged Out' });
    router.push('/');
  };

  const getParticipantNames = (participants: Player[], currentUserId: string) => {
    const otherPlayers = participants.filter((p) => p.id !== currentUserId).map((p) => p.name);
    if (otherPlayers.length === 0) return 'Solo Game';
    return otherPlayers.join(' & ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Logo
            className="w-12 h-12 text-primary cursor-pointer"
            onClick={() => router.push('/')}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" onClick={() => router.push('/')}>
              <Home className="mr-2" /> Home
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2" /> Logout
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">My Sessions</CardTitle>
            <CardDescription>
              Review your past conversations or jump back into an active one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="history">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="history">Completed</TabsTrigger>
                <TabsTrigger value="in-progress">In-Progress</TabsTrigger>
              </TabsList>
              <TabsContent value="history">
                {history.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {history.map((game, index) => (
                      <AccordionItem value={`item-${index}`} key={game.id}>
                        <AccordionTrigger>
                          <div className="flex justify-between w-full pr-4">
                            <span>
                              Session with {getParticipantNames(game.participants, user!.uid)}
                            </span>
                            <span className="text-muted-foreground">
                              {game.completedAt?.toLocaleDateString()}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-invert prose-p:text-foreground/90 prose-headings:text-primary max-w-none text-base whitespace-pre-wrap p-4 bg-secondary rounded-md">
                            {game.summary}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12">
                    <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">No Games Yet</h3>
                    <p className="text-muted-foreground mt-2">
                      You haven't completed any games. Why not start one now?
                    </p>
                    <Button onClick={() => router.push('/')} className="mt-6">
                      Start a New Game
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="in-progress">
                {inProgress.length > 0 ? (
                  <div className="space-y-4">
                    {inProgress.map((game) => (
                      <Card key={game.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold">
                            Session with {getParticipantNames(game.participants, user!.uid)}
                          </p>
                          <p className="text-sm text-muted-foreground">Currently on: {game.step}</p>
                        </div>
                        <Button onClick={() => router.push(`/game/${game.id}`)}>
                          <Play className="mr-2 h-4 w-4" /> Resume
                        </Button>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">No Active Games</h3>
                    <p className="text-muted-foreground mt-2">
                      You don't have any games in progress.
                    </p>
                    <Button onClick={() => router.push('/')} className="mt-6">
                      Start a New Game
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
