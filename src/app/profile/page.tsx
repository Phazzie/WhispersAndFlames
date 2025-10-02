
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Home, Frown, Play } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import type { Player } from '@/lib/game-types';

type GameSession = {
    id: string;
    participants: Player[];
    summary?: string;
    completedAt?: Date;
    step: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<GameSession[]>([]);
  const [inProgress, setInProgress] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchGames = async () => {
      setLoading(true);
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, where('playerIds', 'array-contains', user.uid), orderBy('completedAt', 'desc'));
      
      try {
        const querySnapshot = await getDocs(q);
        
        const allUserGames = querySnapshot.docs
          .map(doc => {
            const gameData = doc.data();
            const participants = gameData.players.filter((p: any) => p.id !== user.uid);
            
            const completedAt = gameData.completedAt instanceof Timestamp 
                ? gameData.completedAt.toDate() 
                : (gameData.completedAt ? new Date(gameData.completedAt) : undefined);

            return {
              id: doc.id,
              completedAt: completedAt,
              participants: participants,
              summary: gameData.summary,
              step: gameData.step,
            };
          });

        setHistory(allUserGames.filter(g => g.step === 'summary' && g.completedAt));
        setInProgress(allUserGames.filter(g => g.step !== 'summary'));

      } catch (error) {
        console.error("Error fetching game history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [user]);

  const getParticipantNames = (participants: Player[]) => {
      if (participants.length === 0) {
          return 'Solo Game';
      }
      return participants.map(p => p.name).join(' & ');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background font-body">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 md:p-12 bg-background font-body">
        <div className="w-full max-w-4xl mx-auto">
            <div className='flex items-center justify-between mb-8'>
                <Logo className="w-12 h-12 text-primary cursor-pointer" onClick={() => router.push('/')} />
                 <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
                    <Button variant="ghost" onClick={() => router.push('/')}><Home className="mr-2"/> Home</Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">My Sessions</CardTitle>
                    <CardDescription>Review your past conversations or jump back into an active one.</CardDescription>
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
                                                <div className='flex justify-between w-full pr-4'>
                                                    <span>Session with {getParticipantNames(game.participants)}</span>
                                                    <span className='text-muted-foreground'>{game.completedAt?.toLocaleDateString()}</span>
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
                                    <h3 className="text-xl font-semibold font-headline">No Games Yet</h3>
                                    <p className="text-muted-foreground mt-2">You haven't completed any games. Why not start one now?</p>
                                    <Button onClick={() => router.push('/')} className="mt-6">
                                        Start a New Game
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="in-progress">
                             {inProgress.length > 0 ? (
                                <div className="space-y-4">
                                    {inProgress.map(game => (
                                        <Card key={game.id} className="flex items-center justify-between p-4">
                                            <div>
                                                <p className="font-semibold">Session with {getParticipantNames(game.participants)}</p>
                                                <p className="text-sm text-muted-foreground">Game in progress</p>
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
                                    <h3 className="text-xl font-semibold font-headline">No Active Games</h3>
                                    <p className="text-muted-foreground mt-2">You don't have any games in progress.</p>
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
