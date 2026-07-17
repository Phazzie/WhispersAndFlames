import { Feather, RotateCcw, Sparkles } from "lucide-react";

import type { CompleteRoomView } from "@/lib/game/contracts";

interface CompleteScreenProps {
  view: CompleteRoomView;
  onRestart: () => void;
}

export function CompleteScreen({ view, onRestart }: CompleteScreenProps) {
  const hasSparks = view.complete.approvedCount > 0;

  return (
    <section className="complete-flow" aria-labelledby="complete-title">
      <div className="afterglow-mark" aria-hidden="true">
        <span />
        <Sparkles size={28} strokeWidth={1.3} />
        <span />
      </div>
      <p className="eyebrow">
        <Feather size={14} aria-hidden="true" /> A note from Scribe
      </p>
      <h1 id="complete-title">
        {hasSparks ? "Keep a little of this glow." : "Honesty still counts."}
      </h1>

      <article className="scribe-note" data-testid="complete-summary">
        <span className="opening-quote" aria-hidden="true">
          “
        </span>
        <p>{view.complete.summary}</p>
        <footer>— Scribe</footer>
      </article>

      <div className="complete-details">
        <div>
          <strong>{view.complete.approvedCount}</strong>
          <span>
            {view.complete.approvedCount === 1 ? "mutual spark" : "mutual sparks"}
          </span>
        </div>
        <p>
          {hasSparks
            ? "Only the themes you both chose shaped this note. Your private answers stayed private."
            : "No common theme was forced. Your private answers stayed private, exactly as promised."}
        </p>
      </div>

      <button
        type="button"
        className="secondary-button restart-button"
        data-testid="restart-session"
        onClick={onRestart}
      >
        <RotateCcw size={17} aria-hidden="true" />
        Forget this room and begin again
      </button>
    </section>
  );
}
