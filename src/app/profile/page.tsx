
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Home, Frown } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

type GameHistory = {
    id: string;
    completedAt: Date;
    partner: { id: string, email: string };
    summary: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
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

    const fetchHistory = async () => {
      setLoading(true);
      const gamesRef = collection(db, 'games');
      const q = query(
        gamesRef,
        where('players', 'array-contains', { id: user.uid, name: user.displayName || `Player`, email: user.email, selectedCategories: [], isReady: false }),
        where('step', '==', 'summary'),
        where('completedAt', '!=', null),
        orderBy('completedAt', 'desc')
      );
      
      try {
        const querySnapshot = await getDocs(q);
        const fetchedHistory: GameHistory[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const partnerData = data.players.find((p: any) => p.id !== user.uid);
          // Firestore Timestamps need to be converted to JS Dates
          const completedAtDate = data.completedAt instanceof Timestamp ? data.completedAt.toDate() : new Date(data.completedAt);

          fetchedHistory.push({
            id: doc.id,
            completedAt: completedAtDate,
            partner: partnerData || { id: 'solo', email: 'Solo Game' },
            summary: data.summary,
          });
        });
        
        // This is a workaround because Firestore doesn't support 'array-contains' with other query clauses perfectly.
        // We have to filter client-side.
        const gamesWithUser = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data()}))
          .filter(game => game.players.some((p: any) => p.id === user.uid));

        const finalHistory: GameHistory[] = gamesWithUser.map(game => {
            const partnerData = game.players.find((p: any) => p.id !== user.uid);
            const completedAtDate = game.completedAt instanceof Timestamp ? game.completedAt.toDate() : new Date(game.completedAt);
            return {
                id: game.id,
                completedAt: completedAtDate,
                partner: partnerData || { id: 'solo', email: 'Solo Game' },
                summary: game.summary,
            }
        }).sort((a,b) => b.completedAt.getTime() - a.completedAt.getTime());

        setHistory(finalHistory);

      } catch (error) {
        console.error("Error fetching game history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

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
            <div className='flex items-center justify-between mb-8'>
                <Logo className="w-12 h-12 text-primary cursor-pointer" onClick={() => router.push('/')} />
                <Button variant="ghost" onClick={() => router.push('/')}><Home className="mr-2"/> Home</Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">My Game History</CardTitle>
                    <CardDescription>A look back at your past conversations.</CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {history.map((game, index) => (
                                <AccordionItem value={`item-${index}`} key={game.id}>
                                    <AccordionTrigger>
                                        <div className='flex justify-between w-full pr-4'>
                                            <span>Session with {game.partner.email}</span>
                                            <span className='text-muted-foreground'>{game.completedAt.toLocaleDateString()}</span>
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
                            <p className="text-muted-foreground mt-2">You haven't completed any games. Why not start one now?</p>
                            <Button onClick={() => router.push('/')} className="mt-6">
                                Start a New Game
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
    