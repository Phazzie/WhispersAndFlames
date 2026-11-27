'use client';

import { useUser, useClerk, SignInButton, SignUpButton } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/dossier';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { clientGame } from '@/lib/client-game';
import { generateRoomCode } from '@/lib/game-utils';
import { localGame } from '@/lib/local-game';

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playLocally, setPlayLocally] = useState(false);
  const [localPlayerNames, setLocalPlayerNames] = useState(['', '']);
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
        title: 'Clocked out',
        description: 'Your file is locked in the cabinet.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleCreateRoom = async () => {
    if (playLocally) {
      const names = localPlayerNames.map((name) => name.trim()).filter(Boolean);
      if (names.length < 2 || names.length > 3) {
        toast({
          title: 'Not enough agents',
          description: 'One device needs 2 or 3 aliases.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const local = localGame.create(names);
        router.push(`/game/${local.roomCode}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      return;
    }

    if (!user) return;

    if (!playerName) {
      toast({
        title: 'Alias required',
        description: 'Ember needs something to call you.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newRoomCode = generateRoomCode();
      await clientGame.create(newRoomCode, playerName);
      router.push(`/game/${newRoomCode}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!user) return;
    if (!roomCode) {
      toast({
        title: 'No codename',
        description: "Type the codename your partner's file shows.",
        variant: 'destructive',
      });
      return;
    }
    if (!playerName) {
      toast({
        title: 'Alias required',
        description: 'Ember needs something to call you.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await clientGame.join(roomCode.toUpperCase(), playerName);
      router.push(`/game/${roomCode.toUpperCase()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8" role="status">
        <p className="font-typewriter text-sm uppercase tracking-[0.3em] text-foreground/70 animate-pulse">
          Pulling your file…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <SignInButton mode="modal">
            <Button className="w-full font-typewriter uppercase tracking-widest" size="lg">
              Show your badge
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button
              variant="outline"
              className="w-full border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-widest text-card-foreground hover:bg-card-foreground hover:text-card"
              size="lg"
            >
              Request clearance
            </Button>
          </SignUpButton>
        </div>
        <p className="text-center font-hand text-xl text-accent">
          (badge = sign in · clearance = make an account. Free. We checked.)
        </p>
      </div>
    );
  }

  const agentEmail = user.emailAddresses[0]?.emailAddress || 'unknown agent';

  return (
    <div className="space-y-7 text-left">
      <p className="font-typewriter text-xs uppercase tracking-[0.2em] text-card-foreground/70">
        Agent on file: <span className="normal-case tracking-normal">{agentEmail}</span>
      </p>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 border-2 border-dashed border-card-foreground/40 p-3">
          <div>
            <Label
              htmlFor="play-locally"
              className="font-typewriter text-sm uppercase tracking-wider"
            >
              One device
            </Label>
            <p className="mt-1 text-xs text-card-foreground/70">
              Pass the phone around. Everyone else looks away.
            </p>
          </div>
          <Switch
            id="play-locally"
            aria-label="Play on one device"
            checked={playLocally}
            onCheckedChange={setPlayLocally}
          />
        </div>

        {playLocally ? (
          <div className="space-y-2">
            <FieldLabel>Agents at this terminal</FieldLabel>
            {localPlayerNames.map((name, index) => (
              <Input
                key={`local-player-${index + 1}`}
                aria-label={`Agent ${index + 1} alias`}
                placeholder={`Agent ${index + 1} alias`}
                value={name}
                className="bg-card/60 font-hand text-2xl"
                onChange={(e) => {
                  const next = [...localPlayerNames];
                  next[index] = e.target.value;
                  setLocalPlayerNames(next);
                }}
              />
            ))}
            {localPlayerNames.length < 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="font-typewriter uppercase tracking-wider"
                onClick={() => setLocalPlayerNames((prev) => [...prev, ''])}
              >
                + Add a third agent
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <FieldLabel htmlFor="alias">Your alias</FieldLabel>
            <Input
              id="alias"
              placeholder="What should Ember call you?"
              value={playerName}
              className="bg-card/60 font-hand text-2xl"
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
        )}

        <Button
          onClick={handleCreateRoom}
          className="w-full font-typewriter uppercase tracking-widest"
          size="lg"
        >
          {playLocally ? 'Open the file on this device' : 'Open a new file'}
        </Button>
      </div>

      {!playLocally && (
        <div className="space-y-2 border-t-2 border-dashed border-card-foreground/40 pt-6">
          <FieldLabel htmlFor="room-code">Got a codename from your partner?</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="room-code"
              placeholder="TIGER-OWL-WOLF-42"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={64}
              aria-label="Room code"
              className="bg-card/60 font-typewriter uppercase tracking-wider"
            />
            <Button
              onClick={handleJoinRoom}
              variant="outline"
              className="border-2 border-card-foreground bg-transparent font-typewriter uppercase tracking-widest text-card-foreground hover:bg-card-foreground hover:text-card"
            >
              Report in
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-card-foreground/30 pt-4 font-typewriter text-xs uppercase tracking-widest">
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="underline decoration-dotted underline-offset-4 hover:text-primary"
        >
          Past files
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="underline decoration-dotted underline-offset-4 hover:text-primary"
        >
          Clock out
        </button>
      </div>
    </div>
  );
}
