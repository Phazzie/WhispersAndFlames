import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function GameNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Room not found</h1>
        <p className="text-muted-foreground">That room code doesn&apos;t exist or has expired.</p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
