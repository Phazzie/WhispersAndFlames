
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ClipboardCopy, Users } from 'lucide-react';
import type { StepProps, Player } from '@/lib/game-types';

const PlayerDisplay = ({ player, isMe }: { player: Player, isMe: boolean }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
    <div className="flex flex-col">
      <span className="font-semibold">{player.name} {isMe && '(You)'}</span>
      <span className="text-xs text-muted-foreground">{player.email}</span>
    </div>
    {player.isReady ? <span className="text-sm text-green-400">Ready</span> : <span className="text-sm text-amber-400">Waiting...</span>}
  </div>
);

const EmptyPlayerSlot = () => (
    <div className="flex items-center justify-center p-3 rounded-lg bg-secondary/50 border border-dashed">
        <div className="text-sm text-muted-foreground text-center">Waiting for a player to join...</div>
    </div>
);


export function LobbyStep({ gameState, me, handlers }: StepProps) {
  const { roomRef, updateGameState, toast, getDoc } = handlers;
  const { players, roomCode } = gameState;
  const [playerName, setPlayerName] = useState(me.name);

  const handleNameChange = async () => {
    if (!playerName.trim() || me.name === playerName.trim()) return;

    const currentDoc = await getDoc(roomRef);
    const currentGameState = currentDoc.data() as any;
    
    const updatedPlayers = currentGameState.players.map(p =>
      p.id === me.id ? { ...p, name: playerName.trim() } : p
    );
    await updateGameState({ players: updatedPlayers });
    toast({ title: 'Name updated!', description: `You are now known as ${playerName.trim()}`});
  };

  const handlePlayerReady = async () => {
    await handleNameChange();

    const currentDoc = await getDoc(roomRef);
    const currentGameState = currentDoc.data() as any;

    const updatedPlayers = currentGameState.players.map(p => p.id === me.id ? {...p, isReady: true} : p);
    await updateGameState({ players: updatedPlayers });

    if (updatedPlayers.every(p => p.isReady)) {
      const resetPlayers = updatedPlayers.map(p => ({...p, isReady: false}));
      await updateGameState({ step: 'categories', players: resetPlayers });
    }
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast({ title: 'Copied to Clipboard!' });
    }
  };

  const allPlayers = [...players];
  while(allPlayers.length < 3) {
      allPlayers.push(null as any);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Your Private Room</CardTitle>
        <CardDescription>Share the code, choose your name, and get ready.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 rounded-lg border border-dashed p-4 justify-between">
          <span className="font-mono text-lg font-bold text-primary">{roomCode}</span>
          <Button variant="ghost" size="icon" onClick={copyRoomCode}>
            <ClipboardCopy className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="playerName">Your Name</Label>
          <div className="flex space-x-2">
            <Input 
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onBlur={handleNameChange}
              placeholder="Enter your name"
              disabled={me.isReady}
            />
          </div>
        </div>
        
        <div className="space-y-2">
            {allPlayers.map((player, index) => player 
                ? <PlayerDisplay key={player.id} player={player} isMe={player.id === me.id} />
                : <EmptyPlayerSlot key={`empty-${index}`} />
            )}
        </div>
        <Button onClick={handlePlayerReady} className="w-full" size="lg" disabled={me.isReady || players.length < 3}>
          {me.isReady ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for others...</> : players.length < 3 ? 'Waiting for players...' : "I'm Ready!"}
        </Button>
      </CardContent>
    </Card>
  );
}
