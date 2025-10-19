'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PartyPopper, Clipboard, Download, Loader2 } from 'lucide-react';
import type { StepProps } from '@/lib/game-types';
import { LoadingScreen } from '../loading-screen';

export function SummaryStep({ gameState, me, handlers }: StepProps) {
  const { summary } = gameState;
  const { router, generateTherapistNotesAction, toast } = handlers;
  const [therapistNotes, setTherapistNotes] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const loadTherapistNotes = async () => {
    if (therapistNotes) return; // Already loaded

    setIsLoadingNotes(true);
    try {
      const result = await generateTherapistNotesAction({
        questions: gameState.gameRounds.map((r) => r.question),
        answers: gameState.gameRounds.flatMap((r) => Object.values(r.answers)),
        categories: gameState.commonCategories,
        spicyLevel: gameState.finalSpicyLevel,
        playerCount: gameState.players.length,
      });

      if ('notes' in result) {
        setTherapistNotes(result.notes);
      } else {
        toast({
          title: 'Failed to generate notes',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not generate therapist notes',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const downloadNotes = () => {
    if (!therapistNotes) return;

    const blob = new Blob([therapistNotes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dr-ember-notes-${gameState.roomCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!summary) {
    return <LoadingScreen message="Ember is analyzing your answers..." />;
  }

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader className="items-center text-center">
          <PartyPopper className="w-12 h-12 text-primary mb-2" />
          <CardTitle className="text-3xl">Your Session Summary</CardTitle>
          <CardDescription>A little insight from your conversation.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Playful Summary</TabsTrigger>
              <TabsTrigger value="therapist" onClick={loadTherapistNotes}>
                Dr. Ember&apos;s Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-6">
              <div className="prose prose-invert prose-p:text-foreground/90 prose-headings:text-primary max-w-none text-base whitespace-pre-wrap p-4 bg-secondary rounded-md">
                {summary}
              </div>
            </TabsContent>
            <TabsContent value="therapist" className="mt-6">
              {isLoadingNotes ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Dr. Ember is reviewing your session...</p>
                </div>
              ) : therapistNotes ? (
                <div className="space-y-4">
                  <div
                    className="bg-white text-black p-6 rounded-md font-mono text-sm whitespace-pre-wrap"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, transparent, transparent 24px, #e5e7eb 24px, #e5e7eb 25px)',
                      lineHeight: '25px',
                    }}
                  >
                    {therapistNotes}
                  </div>
                  <Button onClick={downloadNotes} variant="outline" className="w-full" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Notes
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clipboard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click the tab to load notes</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <Button onClick={() => router.push('/profile')} className="w-full mt-6" size="lg">
            View My History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
