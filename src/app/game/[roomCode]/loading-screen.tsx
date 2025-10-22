'use client';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  'Fanning the flames...',
  'Crafting the perfect question...',
  'Stoking the embers of connection...',
  'Translating whispers into words...',
  'Finding the right spark...',
];

export function LoadingScreen({ message }: { message?: string }) {
  const [loadingMessage, setLoadingMessage] = useState(message || LOADING_MESSAGES[0]);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setLoadingMessage((prev) => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
        return LOADING_MESSAGES[nextIndex];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground text-lg animate-pulse">{loadingMessage}</p>
    </div>
  );
}
