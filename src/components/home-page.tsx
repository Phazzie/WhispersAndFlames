'use client';

import { useUser, useClerk, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Sparkles, ArrowRight, LogOut, History, Play } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { clientGame } from '@/lib/client-game';
import { generateRoomCode } from '@/lib/game-utils';

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      await signOut();
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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
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
          <CardContent className="space-y-4">
            <SignInButton mode="modal">
              <Button className="w-full" size="lg">
                <LogOut className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outline" className="w-full" size="lg">
                <ArrowRight className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </SignUpButton>
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
          <CardDescription>
            Welcome, {user.emailAddresses[0]?.emailAddress || 'Guest'}
          </CardDescription>
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
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
