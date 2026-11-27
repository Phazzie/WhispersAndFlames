'use client';
import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  'Ember is typing up the next question…',
  'Pulling your file from the cabinet…',
  'Checking the codename against the ledger…',
  'Steaming open the envelope…',
  'Sharpening the red pencil…',
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
    <div
      className="flex min-h-[60vh] w-full flex-col items-center justify-center p-4"
      role="status"
      aria-live="polite"
    >
      {/* A typewriter carriage: three keys striking in turn. */}
      <div className="flex gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-3 w-3 rounded-full bg-foreground/80 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="mt-5 max-w-sm text-center font-typewriter text-sm uppercase tracking-[0.2em] text-foreground/80">
        {loadingMessage}
      </p>
    </div>
  );
}
