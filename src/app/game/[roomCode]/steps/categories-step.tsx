
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { CATEGORIES, QUESTIONS_PER_CATEGORY } from '@/lib/constants';
import type { StepProps, GameState } from '@/lib/game-types';

const PLAYER_COLORS = ['bg-blue-400', 'bg-green-400', 'bg-yellow-400'];
const getPlayerColor = (playerIndex: number) => PLAYER_COLORS[playerIndex] || 'bg-gray-400';

export function CategoriesStep({ gameState, me, handlers }: StepProps) {
  const { roomRef, updateGameState, toast, getDoc } = handlers;
  const { players } = gameState;

  const handleToggleCategory = async (categoryName: string) => {
    if (me.isReady) return;

    const myCurrentCategories = me.selectedCategories || [];
    const newCategories = myCurrentCategories.includes(categoryName)
        ? myCurrentCategories.filter((c) => c !== categoryName)
        : [...myCurrentCategories, categoryName];

    const currentDoc = await getDoc(roomRef);
    const currentGameState = currentDoc.data() as GameState;

    const updatedPlayers = currentGameState.players.map(p =>
        p.id === me.id ? { ...p, selectedCategories: newCategories } : p
    );
    await updateGameState({ players: updatedPlayers });
  };
  
  const handlePlayerReady = async () => {
    // Player must select at least one category to be ready
    if (me.selectedCategories.length === 0) {
        toast({ title: "No categories selected", description: "Please select at least one category to explore.", variant: 'destructive'});
        return;
    }

    const currentDoc = await getDoc(roomRef);
    let currentGameState = currentDoc.data() as GameState;

    // Critical Bug Fix: Prevent moving forward if not all players are present.
    if (currentGameState.players.length !== 3) {
      toast({ title: "Waiting for Players", description: "You need exactly 3 players to start the game.", variant: 'destructive', duration: 5000});
      return;
    }

    let updatedPlayers = currentGameState.players.map(p => p.id === me.id ? {...p, isReady: true} : p);
    await updateGameState({ players: updatedPlayers });

    // Re-fetch the state to ensure we have the most recent data for the final check.
    currentGameState = (await getDoc(roomRef)).data() as GameState;

    // The game should only advance if ALL players are now ready.
    if (currentGameState.players.every(p => p.isReady)) {
      const allSelectedCategories = currentGameState.players.map(p => p.selectedCategories);
      const commonCategories = allSelectedCategories.reduce((a, b) => a.filter(c => b.includes(c)));
          
      if (commonCategories.length === 0) {
          toast({ title: "No Common Ground", description: "All three players must select at least one category in common. Please discuss and re-select.", variant: 'destructive', duration: 8000});
          // Un-ready all players so they can change their selections
          const unReadyPlayers = currentGameState.players.map(p => ({...p, isReady: false}));
          await updateGameState({ players: unReadyPlayers });
          return;
      }
      
      const totalQuestions = commonCategories.length * QUESTIONS_PER_CATEGORY;
      const resetPlayers = currentGameState.players.map(p => ({...p, isReady: false, selectedSpicyLevel: undefined }));
      await updateGameState({ commonCategories, totalQuestions, step: 'spicy', players: resetPlayers });
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-3xl font-bold text-center mb-2">Choose Your Categories</h2>
      <p className="text-muted-foreground text-center mb-8">
        Select themes to explore together. Questions will be drawn from categories you all choose.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {CATEGORIES.map((cat) => {
          const isSelectedByMe = me.selectedCategories.includes(cat.name);
          const selections = players.filter(p => p.selectedCategories?.includes(cat.name));
          const isCommon = selections.length === players.length && players.length === 3;

          return (
            <Card
              key={cat.name}
              onClick={() => handleToggleCategory(cat.name)}
              className={`transition-all duration-200 cursor-pointer relative overflow-hidden
                ${me.isReady ? 'cursor-not-allowed opacity-70' : ''}
                ${isCommon ? 'border-primary ring-2 ring-primary shadow-lg' :
                isSelectedByMe ? 'border-blue-400 ring-2 ring-blue-400' : 'hover:border-primary/50'}
              `}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center aspect-square">
                <cat.icon className={`w-8 h-8 mb-2 ${selections.length > 0 ? 'text-primary' : ''}`} />
                <h3 className="font-semibold text-sm">{cat.name}</h3>
              </CardContent>
              <div className="absolute bottom-1 right-1 flex gap-1">
                  {players.map((player, index) => 
                      player.selectedCategories?.includes(cat.name) && (
                        <div 
                          key={player.id} 
                          className={`w-2 h-2 rounded-full ${getPlayerColor(index)}`} 
                          title={`Selected by ${player.name}`}
                        />
                      )
                  )}
              </div>
            </Card>
          )
        })}
      </div>
      
      <Button onClick={handlePlayerReady} className="w-full max-w-xs mx-auto flex" size="lg" disabled={me.isReady}>
          {me.isReady ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for others...</> : 'Confirm Selections'}
      </Button>
    </div>
  );
}
