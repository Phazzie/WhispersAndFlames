/**
 * EYES ONLY — the visual language of the game.
 *
 * The whole app is a classified case file on a desk. Each screen is a page in
 * that file; statements stay redacted until every agent has given theirs;
 * the spice level is a security clearance; Dr. Ember's notes arrive as a
 * psych evaluation on agency letterhead. These pieces keep that consistent.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { SpicyLevel } from '@/lib/game-types';

/** What each spice level is called inside the file. The real names still drive the AI. */
export const CLEARANCE: Record<SpicyLevel['name'], { label: string; code: string; brief: string }> =
  {
    Mild: {
      label: 'Confidential',
      code: 'C',
      brief: 'Glances, crushes, the stuff you would admit at brunch.',
    },
    Medium: {
      label: 'Secret',
      code: 'S',
      brief: 'Specific attractions. Implied heat. Questions that make you lower your voice.',
    },
    Hot: {
      label: 'Top Secret',
      code: 'TS',
      brief: 'Explicit desires and detailed fantasies. Lock the door first.',
    },
    'Extra-Hot': {
      label: 'Eyes Only',
      code: 'EO',
      brief: 'Taboo-adjacent and unfiltered. If this leaks, you were never here.',
    },
  };

type SheetProps = {
  children: ReactNode;
  className?: string;
  /** Typed in the header strip, e.g. "FORM WF-1 · INTAKE". */
  form?: string;
  /** Right side of the header strip, e.g. the operation codename. */
  file?: string;
  /** Small tilt, in degrees, so stacked pages don't line up perfectly. */
  tilt?: number;
  clip?: boolean;
};

/** One page in the case file. */
export function Sheet({ children, className, form, file, tilt = 0, clip = false }: SheetProps) {
  return (
    <section
      className={cn('paper relative w-full px-5 py-6 sm:px-10 sm:py-9', className)}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {clip && <PaperClip />}
      {(form || file) && (
        <header className="mb-6 flex items-start justify-between gap-4 border-b-2 border-dashed border-card-foreground/40 pb-3 font-typewriter text-[11px] uppercase tracking-[0.18em] text-card-foreground/80 sm:text-xs">
          <span>{form}</span>
          <span className="text-right">{file}</span>
        </header>
      )}
      {children}
    </section>
  );
}

function PaperClip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 64"
      className="absolute -top-6 left-8 h-16 w-6 drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)]"
      fill="none"
      stroke="hsl(210 8% 70%)"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M7 20 V50 a5 5 0 0 0 10 0 V12 a8 8 0 0 0 -16 0 V48" />
    </svg>
  );
}

type StampProps = {
  children: ReactNode;
  className?: string;
  tilt?: number;
  /** Stamp in carbon-copy blue instead of red. */
  blue?: boolean;
};

/** A rubber stamp. Decorative unless it carries the only copy of a status. */
export function Stamp({ children, className, tilt = -8, blue = false }: StampProps) {
  return (
    <span
      className={cn(
        'stamp inline-block select-none text-base leading-none sm:text-lg',
        blue && 'text-accent',
        className
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </span>
  );
}

/** A black redaction bar sized roughly like the text it hides. */
export function Redacted({ length = 24, label }: { length?: number; label?: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle" aria-label={label ?? 'Redacted'}>
      {Array.from({ length: Math.max(1, Math.ceil(length / 9)) }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="redacted inline-block h-[1.1em]"
          style={{ width: `${4 + ((i * 37) % 5)}ch` }}
        />
      ))}
    </span>
  );
}

/** A typed field label, like a blank on a government form. */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-typewriter text-[11px] uppercase tracking-[0.2em] text-card-foreground/75"
    >
      {children}
    </label>
  );
}

/** Desk-level caption text, for things written outside the paper. */
export function DeskNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'font-typewriter text-xs uppercase tracking-[0.25em] text-foreground/60',
        className
      )}
    >
      {children}
    </p>
  );
}
