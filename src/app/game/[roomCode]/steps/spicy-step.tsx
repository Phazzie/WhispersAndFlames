
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { SPICY_LEVELS } from '@/lib/constants';
import type { StepProps, GameState, SpicyLevel } from '@/lib/game-types';

export function SpicyStep({ gameState, me, handlers }: StepProps) {
  const { roomRef, updateGameState, getDoc, setIsLoading, setError, generateQuestionAction, toast } = handlers;
  const { players, finalSpicyLevel, commonCategories } = gameState;
  const partner = players.find(p => p.id !== me.id);
  const mySpicySelection = me?.selectedSpicyLevel;
  const partnerSpicySelection = partner?.selectedSpicyLevel;

  const startFirstQuestion = async (level: SpicyLevel['name'], categories: string[]) => {
    setError(null);
    const result = await generateQuestionAction({
        categories: [categories[0]],
        spicyLevel: level,
        previousQuestions: [],
    });

    if ('question' in result) {
        const resetPlayers = gameState.players.map(p => ({ ...p, isReady: false }));
        await updateGameState({ currentQuestion: result.question, step: 'game', currentQuestionIndex: 1, players: resetPlayers });
    } else {
        setError(result.error);
        toast({ title: 'Error starting game', description: result.error, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleSpicySelect = async (value: SpicyLevel['name']) => {
    if (me.isReady) return;
    
    let currentGameState = (await getDoc(roomRef)).data() as GameState;
    
    const updatedPlayers = currentGameState.players.map(p => 
      p.id === me.id ? { ...p, selectedSpicyLevel: value, isReady: true } : p
    );
    
    await updateGameState({ players: updatedPlayers });
    currentGameState.players = updatedPlayers;

    const allReady = updatedPlayers.every(p => p.isReady);
    
    if (allReady) {
        setIsLoading(true);
        const p1Level = SPICY_LEVELS.findIndex(l => l.name === updatedPlayers.find(p=>p.id === me.id)!.selectedSpicyLevel!);
        const p2Level = SPICY_LEVELS.findIndex(l => l.name === updatedPlayers.find(p=>p.id !== me.id)!.selectedSpicyLevel!);
        const finalLevelIndex = Math.min(p1Level, p2Level);
        const finalLevel = SPICY_LEVELS[finalLevelIndex].name;

        await updateGameState({ finalSpicyLevel: finalLevel });
        await startFirstQuestion(finalLevel, currentGameState.commonCategories);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <h2 className="text-3xl font-bold text-center mb-2">Set The Mood</h2>
      <p className="text-muted-foreground text-center mb-8">
        Choose your desired level of intensity. The game will use the mildest level chosen by either of you.
      </p>
      <RadioGroup
          value={mySpicySelection}
          onValueChange={handleSpicySelect}
          className="space-y-4"
          disabled={me.isReady}
        >
          {SPICY_LEVELS.map((level) => (
              <Card key={level.name} className={`has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary`}>
                  <Label htmlFor={level.name} className={`flex items-start space-x-4 p-4 cursor-pointer ${me.isReady ? 'cursor-not-allowed' : ''}`}>
                      <RadioGroupItem value={level.name} id={level.name} className="mt-1"/>
                      <div className="flex-1">
                          <h3 className="font-semibold">{level.name}</h3>
                          <p className="text-muted-foreground text-sm">{level.description}</p>
                      </div>
                  </Label>
              </Card>
          ))}
      </RadioGroup>
      {(me.isReady || partner?.isReady) && (
        <div className='flex justify-around mt-4 p-4 bg-secondary/50 rounded-lg'>
          <div className='text-center'>
            <p className='font-semibold'>{me.name}'s choice:</p>
            <p className='text-primary font-bold text-lg'>{mySpicySelection || 'Choosing...'}</p>
          </div>
          {partner && <div className='text-center'>
            <p className='font-semibold'>{partner.name}'s choice:</p>
            <p className='text-primary font-bold text-lg'>{partnerSpicySelection || 'Choosing...'}</p>
          </div>}
        </div>
      )}
      {players.every(p => p.isReady) && (
          <div className="text-center mt-4 space-y-2">
              <p className="text-muted-foreground">Both players are ready. The game will begin with <span className="font-bold text-primary">{finalSpicyLevel}</span> intensity.</p>
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          </div>
      )}
    </div>
  );
}
