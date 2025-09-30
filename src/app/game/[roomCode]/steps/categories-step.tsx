
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { CATEGORIES, QUESTIONS_PER_CATEGORY } from '@/lib/constants';
import type { StepProps, GameState } from '@/lib/game-types';

export function CategoriesStep({ gameState, me, handlers }: StepProps) {
  const { roomRef, updateGameState, toast, getDoc } = handlers;
  const { players } = gameState;
  const partner = players.find(p => p.id !== me.id);

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
    const currentDoc = await getDoc(roomRef);
    let currentGameState = currentDoc.data() as GameState;

    const updatedPlayers = currentGameState.players.map(p => p.id === me.id ? {...p, isReady: true} : p);
    await updateGameState({ players: updatedPlayers });

    currentGameState = { ...currentGameState, players: updatedPlayers };

    if (updatedPlayers.every(p => p.isReady)) {
      const p1Categories = updatedPlayers.find(p => p.id === me.id)!.selectedCategories;
      const p2Categories = updatedPlayers.find(p => p.id !== me.id)!.selectedCategories;
      const commonCategories = p1Categories.filter(c => p2Categories.includes(c));
          
      if (commonCategories.length === 0) {
          toast({ title: "No Common Ground", description: "You and your partner need to select at least one category in common.", variant: 'destructive', duration: 5000});
          const unReadyPlayers = updatedPlayers.map(p => ({...p, isReady: false}));
          await updateGameState({ players: unReadyPlayers });
          return;
      }
      
      const totalQuestions = commonCategories.length * QUESTIONS_PER_CATEGORY;
      const resetPlayers = updatedPlayers.map(p => ({...p, isReady: false}));
      await updateGameState({ commonCategories, totalQuestions, step: 'spicy', players: resetPlayers });
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-3xl font-bold text-center mb-2">Choose Your Categories</h2>
      <p className="text-muted-foreground text-center mb-8">
        Select themes to explore together. Questions will be drawn from categories you both choose.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {CATEGORIES.map((cat) => {
          const isSelectedByMe = me.selectedCategories.includes(cat.name);
          const isSelectedByPartner = partner?.selectedCategories.includes(cat.name);
          const isCommon = isSelectedByMe && isSelectedByPartner;

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
                <cat.icon className={`w-8 h-8 mb-2 ${isSelectedByMe || isSelectedByPartner ? 'text-primary' : ''}`} />
                <h3 className="font-semibold text-sm">{cat.name}</h3>
              </CardContent>
              <div className="absolute bottom-1 right-1 flex gap-1">
                  {isSelectedByMe && <div className="w-2 h-2 rounded-full bg-blue-400" title={`Selected by ${me.name}`}></div>}
                  {partner && isSelectedByPartner && <div className="w-2 h-2 rounded-full bg-green-400" title={`Selected by ${partner.name}`}></div>}
              </div>
            </Card>
          )
        })}
      </div>
      
      <Button onClick={handlePlayerReady} className="w-full max-w-xs mx-auto flex" size="lg" disabled={me.isReady || me.selectedCategories.length === 0}>
          {me.isReady ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for partner...</> : 'Confirm Selections'}
      </Button>
    </div>
  );
}
