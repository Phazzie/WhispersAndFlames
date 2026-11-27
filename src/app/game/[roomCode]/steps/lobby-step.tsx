'use client';

import { Loader2, ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

import { FieldLabel, Sheet, Stamp } from '@/components/dossier';
import { QRCodeShare } from '@/components/qr-code-share';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StepProps, Player } from '@/lib/game-types';

const PlayerDisplay = ({
  player,
  isMe,
  index,
}: {
  player: Player;
  isMe: boolean;
  index: number;
}) => (
  <li className="flex items-center justify-between gap-3 border-b border-dashed border-card-foreground/30 py-3">
    <div className="min-w-0">
      <span className="font-typewriter text-[11px] uppercase tracking-[0.2em] text-card-foreground/60">
        Agent {index + 1}
        {isMe && ' · you'}
      </span>
      <p className="truncate font-hand text-3xl leading-none text-accent">{player.name}</p>
    </div>
    {player.isReady ? (
      <Stamp className="shrink-0 text-sm" tilt={-7}>
        Ready
      </Stamp>
    ) : (
      <span className="shrink-0 font-typewriter text-xs uppercase tracking-wider text-card-foreground/60">
        Waiting...
      </span>
    )}
  </li>
);

const EmptyPlayerSlot = ({ index }: { index: number }) => (
  <li className="flex items-center justify-between border-b border-dashed border-card-foreground/30 py-3">
    <span className="font-typewriter text-[11px] uppercase tracking-[0.2em] text-card-foreground/50">
      Agent {index + 1}
    </span>
    <span className="font-typewriter text-xs uppercase tracking-wider text-card-foreground/40">
      Open seat (optional, up to 3 players)
    </span>
  </li>
);

export function LobbyStep({ gameState, me, handlers }: StepProps) {
  const { updateGameState, toast } = handlers;
  const { players, roomCode } = gameState;
  const [playerName, setPlayerName] = useState(me.name);

  const handleNameChange = async () => {
    const newName = playerName.trim();
    if (!newName || me.name === newName) return;

    const updatedPlayers = gameState.players.map((p: Player) =>
      p.id === me.id ? { ...p, name: newName } : p
    );

    await updateGameState({ players: updatedPlayers });
    toast({ title: 'Name updated!', description: `You are now known as ${newName}` });
  };

  const handlePlayerReady = async () => {
    // Check if we have at least 2 players before allowing ready-up.
    if (gameState.players.length < 2) {
      toast({
        title: 'Need a second agent',
        description: 'Send your partner the codename or the QR code first.',
        variant: 'destructive',
      });
      return;
    }

    const updatedPlayers = gameState.players.map((p: Player) =>
      p.id === me.id ? { ...p, isReady: true } : p
    );
    const saved = await updateGameState({ players: updatedPlayers });
    if (!saved) return;

    // Decide from the server's copy: our local one may not show a partner who
    // readied up a moment ago.
    if (saved.step === 'lobby' && saved.players.every((p: Player) => p.isReady)) {
      const resetPlayers = saved.players.map((p: Player) => ({ ...p, isReady: false }));
      await updateGameState({ step: 'categories', players: resetPlayers });
    }
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast({ title: 'Codename copied', description: 'Send it to your partner. Only them.' });
    }
  };

  const allPlayers: (Player | null)[] = [...players];
  while (allPlayers.length < 3) {
    allPlayers.push(null);
  }

  // Share a join link that prefills the room code on home so guests can enter their name and join.
  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?join=${encodeURIComponent(roomCode)}`
      : '';

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
      <Sheet form="Form WF-2 · Briefing" file={`Op. ${roomCode}`} clip>
        <h2 className="font-typewriter text-2xl sm:text-3xl">Your private room</h2>
        <p className="mt-2 text-sm text-card-foreground/75">
          Two or three agents. Everyone signs in, everyone says they&apos;re in, then Ember opens
          the file.
        </p>

        <div className="mt-5 flex items-center justify-between gap-2 border-2 border-card-foreground/70 px-3 py-2">
          <div className="min-w-0">
            <FieldLabel>Codename</FieldLabel>
            <span className="block truncate font-typewriter text-lg tracking-wider text-primary sm:text-xl">
              {roomCode}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={copyRoomCode} aria-label="Copy codename">
            <ClipboardCopy className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5 space-y-1">
          <FieldLabel htmlFor="playerName">Your alias</FieldLabel>
          <Input
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onBlur={handleNameChange}
            placeholder="What should Ember call you?"
            disabled={me.isReady}
            className="bg-card/60 font-hand text-2xl"
          />
        </div>

        <ul className="mt-4" aria-label="Agents">
          {allPlayers.map((player, index) =>
            player ? (
              <PlayerDisplay
                key={player.id}
                player={player}
                isMe={player.id === me.id}
                index={index}
              />
            ) : (
              <EmptyPlayerSlot key={`empty-${index}`} index={index} />
            )
          )}
        </ul>

        <Button
          onClick={handlePlayerReady}
          className="mt-6 w-full font-typewriter uppercase tracking-widest"
          size="lg"
          disabled={me.isReady || players.length < 2}
          aria-label={me.isReady ? 'Waiting for others' : "I'm Ready!"}
        >
          {me.isReady ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting on the others…
            </>
          ) : players.length < 2 ? (
            'Waiting for a second agent…'
          ) : (
            "I'm in. Open the file."
          )}
        </Button>
      </Sheet>

      {joinUrl && <QRCodeShare roomCode={roomCode} gameUrl={joinUrl} />}
    </div>
  );
}
