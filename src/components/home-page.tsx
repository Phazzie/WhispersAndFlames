'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateRoomCode } from '@/lib/game-utils';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HomePageClient() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const { toast } = useToast();

  const handleCreateRoom = () => {
    const newRoomCode = generateRoomCode();
    router.push(`/game/${newRoomCode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <Tabs defaultValue="create" className="w-full">
        <CardHeader>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Room</TabsTrigger>
            <TabsTrigger value="join">Join Room</TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent value="create">
          <CardContent className="flex flex-col items-center text-center space-y-6 p-6">
            <CardTitle>Start a New Game</CardTitle>
            <CardDescription>
              Create a private room and invite your partner to begin a new journey of discovery.
            </CardDescription>
            <Button size="lg" className="w-full font-bold" onClick={handleCreateRoom}>
              <Sparkles className="mr-2 h-5 w-5" />
              Create Private Room
            </Button>
          </CardContent>
        </TabsContent>
        <TabsContent value="join">
          <form onSubmit={handleJoinRoom}>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2 text-center">
                <CardTitle>Join an Existing Room</CardTitle>
                <CardDescription>
                  Enter the animal-themed code from your partner to join their room.
                </CardDescription>
              </div>
              <div className="space-y-2">
                <Input
                  id="room-code"
                  placeholder="e.g., Lion-Tiger-Bear-42"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="text-center text-lg h-12"
                />
              </div>
              <Button type="submit" size="lg" className="w-full font-bold">
                Join Room
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
