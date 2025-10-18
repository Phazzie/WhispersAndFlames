'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PartyPopper } from 'lucide-react';
import type { StepProps } from '@/lib/game-types';
import { LoadingScreen } from '../loading-screen';

export function SummaryStep({ gameState, me, handlers }: StepProps) {
  const { summary } = gameState;
  const { router } = handlers;

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
          <div className="prose prose-invert prose-p:text-foreground/90 prose-headings:text-primary max-w-none text-base whitespace-pre-wrap p-4 bg-secondary rounded-md">
            {summary}
          </div>
          <Button onClick={() => router.push('/profile')} className="w-full mt-6" size="lg">
            View My History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
