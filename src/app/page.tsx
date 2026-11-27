import { Suspense } from 'react';

import { DeskNote, Sheet, Stamp } from '@/components/dossier';
import HomePageClient from '@/components/home-page';
import { Logo } from '@/components/icons/logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl">
        {/* The folder tab sticking up from the file. */}
        <div className="ml-6 inline-block rounded-t-md bg-secondary px-5 pb-2 pt-2 font-typewriter text-[11px] uppercase tracking-[0.25em] text-secondary-foreground shadow-[0_-4px_10px_rgba(0,0,0,0.35)]">
          File WF-0214 · Whispers and Flames
        </div>

        <Sheet clip className="-mt-px" tilt={-0.6}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-typewriter text-[11px] uppercase tracking-[0.3em] text-card-foreground/70">
                Department of Things You Haven&apos;t Said Out Loud
              </p>
              <h1 className="mt-3 font-typewriter text-4xl leading-none sm:text-5xl">
                Whispers
                <br />
                and Flames
              </h1>
            </div>
            <Logo className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
          </div>

          <div className="relative my-7">
            <Stamp className="absolute -right-2 -top-5 text-2xl sm:text-3xl" tilt={-12}>
              Eyes only
            </Stamp>
            <dl className="space-y-3 font-sans text-[15px] leading-relaxed">
              <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="font-typewriter uppercase tracking-wider text-card-foreground/70">
                  Subject
                </dt>
                <dd>The two of you.</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="font-typewriter uppercase tracking-wider text-card-foreground/70">
                  Objective
                </dt>
                <dd>Find out what you both actually want.</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="font-typewriter uppercase tracking-wider text-card-foreground/70">
                  Method
                </dt>
                <dd>
                  Ember asks. You each give a sealed statement. Nothing gets declassified until{' '}
                  <em>both</em> of you talk.
                </dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="font-typewriter uppercase tracking-wider text-card-foreground/70">
                  Handler
                </dt>
                <dd>
                  Ember. Part wingman, part therapist, part co-conspirator. Notices everything,
                  judges nothing.
                </dd>
              </div>
            </dl>
          </div>

          <Suspense
            fallback={
              <p className="font-typewriter text-sm uppercase tracking-[0.3em] text-card-foreground/70">
                Pulling your file…
              </p>
            }
          >
            <HomePageClient />
          </Suspense>
        </Sheet>

        <DeskNote className="mt-8 text-center">
          A Skeptical Wombat production · burn after reading
        </DeskNote>
      </div>
    </main>
  );
}
