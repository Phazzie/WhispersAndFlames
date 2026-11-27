import Link from 'next/link';

import { Sheet, Stamp } from '@/components/dossier';
import { Button } from '@/components/ui/button';

export default function GameNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Sheet className="max-w-md" form="Notice" file="Returned to sender" tilt={-0.8}>
        <Stamp className="text-2xl" tilt={-10}>
          No such file
        </Stamp>
        <h1 className="mt-6 font-typewriter text-2xl">Room not found</h1>
        <p className="mt-3 text-card-foreground/80">
          That codename doesn&apos;t exist, or the file was shredded after 24 hours.
        </p>
        <Button asChild className="mt-6 w-full font-typewriter uppercase tracking-widest">
          <Link href="/">Back to the front desk</Link>
        </Button>
      </Sheet>
    </main>
  );
}
