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
import { clientAuth, type User } from '@/lib/client-auth';
import { clientGame } from '@/lib/client-game';

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode);
    }
  }, [searchParams]);

  useEffect(() => {
    clientAuth.getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  const handleAuthAction = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        title: 'Authentication Error',
        description: 'Please provide both email and password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newUser = isSignUp
        ? await clientAuth.signUp(email, password)
        : await clientAuth.signIn(email, password);
      setUser(newUser);
      toast({
        title: isSignUp ? 'Account Created' : 'Signed In',
        description: `Welcome${isSignUp ? '' : ' back'}, ${newUser.email}!`,
      });
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await clientAuth.signOut();
      setUser(null);
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    if (!playerName) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to create a room.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newRoomCode = generateRoomCode();
      await clientGame.create(newRoomCode, playerName);
      router.push(`/game/${newRoomCode}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!user) return;
    if (!roomCode) {
      toast({
        title: 'Room Code Required',
        description: 'Please enter a room code to join.',
        variant: 'destructive',
      });
      return;
    }
    if (!playerName) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to join a room.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await clientGame.join(roomCode.toUpperCase(), playerName);
      router.push(`/game/${roomCode.toUpperCase()}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
              <Sparkles className="inline-block w-8 h-8 mr-2" />
              Whispers and Flames
            </CardTitle>
            <CardDescription>Sign in to start your journey</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={() => handleAuthAction(false)} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={() => handleAuthAction(true)} className="w-full">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
            <Sparkles className="inline-block w-8 h-8 mr-2" />
            Whispers and Flames
          </CardTitle>
          <CardDescription>Welcome, {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Input
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleCreateRoom} className="w-full" size="lg">
                <Play className="mr-2 h-5 w-5" />
                Create New Room
              </Button>
              <Button onClick={() => router.push('/profile')} variant="outline" size="lg">
                <History className="mr-2 h-5 w-5" />
                View History
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">Or join an existing room</p>
            <div className="flex gap-2">
              <Input
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <Button onClick={handleJoinRoom}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Join
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleLogout} variant="ghost" className="w-full">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
