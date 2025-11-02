'use client';

import { ArrowRight, Link2, Sparkles, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayerIdentity } from '@/hooks/use-player-identity';
import { useToast } from '@/hooks/use-toast';
import { clientGame } from '@/lib/client-game';
import { generateRoomCode } from '@/lib/game-utils';

const MIN_PLAYER_NAME_LENGTH = 2;

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { identity, hydrated, setName, resetIdentity } = usePlayerIdentity();

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (identity?.name) {
      setPlayerName(identity.name);
    }
  }, [identity?.name]);

  const readyIdentity = useMemo(() => {
    if (!identity) return null;
    const trimmedName = playerName.trim();
    return { ...identity, name: trimmedName };
  }, [identity, playerName]);

  const ensureValidName = () => {
    const trimmed = playerName.trim();
    if (trimmed.length < MIN_PLAYER_NAME_LENGTH) {
      toast({
        title: 'Choose a name',
        description: 'Use at least two characters so other players can recognise you.',
        variant: 'destructive',
      });
      return null;
    }
    setPlayerName(trimmed);
    setName(trimmed);
    return trimmed;
  };

  const handleCreateRoom = async () => {
    if (!readyIdentity) {
      toast({ title: 'Loading identity', description: 'Please try again in a moment.' });
      return;
    }

    const trimmedName = ensureValidName();
    if (!trimmedName) return;

    try {
      setIsBusy(true);
      const newRoomCode = generateRoomCode();
      await clientGame.create(newRoomCode, { ...readyIdentity, name: trimmedName });
      router.push(`/game/${newRoomCode}`);
    } catch (error: unknown) {
      toast({
        title: 'Could not create room',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!readyIdentity) {
      toast({ title: 'Loading identity', description: 'Please try again in a moment.' });
      return;
    }

    const trimmedName = ensureValidName();
    if (!trimmedName) return;

    if (!roomCode || roomCode.trim().length < 4) {
      toast({
        title: 'Room code required',
        description: 'Enter the four-letter code shared by the host.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBusy(true);
      const code = roomCode.trim().toUpperCase();
      await clientGame.join(code, { ...readyIdentity, name: trimmedName });
      router.push(`/game/${code}`);
    } catch (error: unknown) {
      toast({
        title: 'Could not join room',
        description: error instanceof Error ? error.message : 'Check the room code and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetIdentity = () => {
    resetIdentity();
    setPlayerName('');
    toast({
      title: 'Identity reset',
      description: 'Start fresh with a new anonymous profile.',
    });
  };

  if (!hydrated || !identity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
            <Sparkles className="inline-block w-8 h-8 mr-2" />
            Whispers and Flames
          </CardTitle>
          <CardDescription>
            Start a new adventure or jump back into a room with nothing but your name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue={roomCode ? 'join' : 'create'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create a room</TabsTrigger>
              <TabsTrigger value="join">Join a room</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="creator-name">
                  Your name
                </label>
                <Input
                  id="creator-name"
                  value={playerName}
                  maxLength={32}
                  disabled={isBusy}
                  placeholder="E.g. Starry Ember"
                  onChange={(event) => setPlayerName(event.target.value)}
                  onBlur={() => {
                    const trimmed = playerName.trim();
                    setPlayerName(trimmed);
                    setName(trimmed);
                  }}
                />
              </div>
              <Button onClick={handleCreateRoom} className="w-full" size="lg" disabled={isBusy}>
                <Users className="mr-2 h-4 w-4" />
                Launch a private room
              </Button>
            </TabsContent>
            <TabsContent value="join" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="join-name">
                    Your name
                  </label>
                  <Input
                    id="join-name"
                    value={playerName}
                    maxLength={32}
                    disabled={isBusy}
                    placeholder="E.g. Starry Ember"
                    onChange={(event) => setPlayerName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="room-code">
                    Room code
                  </label>
                  <Input
                    id="room-code"
                    value={roomCode}
                    maxLength={6}
                    disabled={isBusy}
                    placeholder="ABCD"
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <Button onClick={handleJoinRoom} className="w-full" size="lg" disabled={isBusy}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Join room
              </Button>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Link2 className="h-4 w-4" />
              Share this device?
            </div>
            <p>
              You are playing anonymously as{' '}
              <span className="font-semibold">{identity.id.slice(0, 8)}</span>. Resetting your
              identity clears local progress and gives you a new anonymous ID.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={handleResetIdentity}
              disabled={isBusy}
            >
              Reset anonymous profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
