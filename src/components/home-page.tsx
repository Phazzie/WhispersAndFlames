
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateRoomCode } from '@/lib/game-utils';
import { Sparkles, ArrowRight, LogIn, History, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

type InProgressGame = {
  id: string;
  partnerName: string;
};

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [inProgressGames, setInProgressGames] = useState<InProgressGame[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode);
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        const gamesQuery = query(
          collection(db, 'games'),
          where('playerIds', 'array-contains', currentUser.uid),
          where('step', '!=', 'summary'),
          limit(5)
        );

        try {
            const querySnapshot = await getDocs(gamesQuery);
            const userGames: InProgressGame[] = [];
            querySnapshot.forEach(doc => {
                const game = doc.data();
                const partner = game.players.find((p: any) => p.id !== currentUser.uid);
                userGames.push({
                    id: doc.id,
                    partnerName: partner?.name || 'Waiting for partner...',
                });
            });
            setInProgressGames(userGames);
        } catch (error) {
            console.error("Error fetching in-progress games:", error);
            toast({ title: 'Could not fetch active games', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
      } else {
        setInProgressGames([]);
      }
    });
    return () => unsubscribe();
  }, [searchParams, toast]);

  const handleAuthAction = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        title: 'Authentication Error',
        description: 'Please provide both email and password.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Sign Up Successful!', description: "You're now logged in." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login Successful!' });
      }

      if (roomCode) {
        router.push(`/game/${roomCode}`);
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    if (!user) {
      toast({ title: 'Please sign in to create a room.', variant: 'destructive' });
      return;
    }
    const newRoomCode = generateRoomCode();
    router.push(`/game/${newRoomCode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Please sign in to join a room.', variant: 'destructive' });
      return;
    }
    if (roomCode.trim()) {
      router.push(`/game/${roomCode.trim()}`);
    } else {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a room code to join.',
        variant: 'destructive',
      });
    }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    setInProgressGames([]);
    toast({ title: 'Logged Out' });
  }

  if (user) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Welcome, {user.email}</CardTitle>
          <CardDescription>Ready to play or pick up where you left off?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {inProgressGames.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Resume Game</h3>
              {inProgressGames.map(game => (
                <Button key={game.id} variant="outline" className="w-full justify-between" onClick={() => router.push(`/game/${game.id}`)}>
                    <span>Session with {game.partnerName}</span>
                    <Play className="h-5 w-5" />
                </Button>
              ))}
            </div>
           )}
           <Button size="lg" className="w-full font-bold" onClick={handleCreateRoom}>
              <Sparkles className="mr-2 h-5 w-5" />
              Create a New Room
            </Button>
            <form onSubmit={handleJoinRoom} className="space-y-2">
               <Input
                  id="room-code-authed"
                  placeholder="Or enter a room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="text-center text-lg h-12"
                />
                <Button type="submit" size="lg" className="w-full font-bold" variant="secondary">
                  Join Room
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </form>
             <Button size="lg" variant="outline" className="w-full" onClick={() => router.push('/profile')}>
                <History className="mr-2 h-5 w-5" />
                My History
            </Button>
            <Button variant="link" onClick={handleLogout}>Logout</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <Tabs defaultValue="login" className="w-full">
        <CardHeader>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent value="login">
          <form onSubmit={(e) => { e.preventDefault(); handleAuthAction(false); }} className="space-y-4 p-6">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : <><LogIn className="mr-2" /> Login</>}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={(e) => { e.preventDefault(); handleAuthAction(true); }} className="space-y-4 p-6">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up & Join'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

    