import { ArrowRight, Check, MessageCircleHeart, Sparkles } from "lucide-react";

import type { DiscussionRoomView } from "@/lib/game/contracts";

interface DiscussionScreenProps {
  view: DiscussionRoomView;
  isSubmitting: boolean;
  onReady: () => Promise<void> | void;
}

export function DiscussionScreen({
  view,
  isSubmitting,
  onReady,
}: DiscussionScreenProps) {
  const { candidate, ordinal, total, selfReady, partnerReady } = view.discussion;

  return (
    <section className="discussion-flow" aria-labelledby="discussion-title">
      <div className="discussion-stage">
        <div className="discussion-counter">
          <span>Mutual spark</span>
          <span>
            {ordinal} / {total}
          </span>
        </div>

        <div className="mutual-mark" aria-hidden="true">
          <span>
            <Sparkles size={24} />
          </span>
        </div>

        <p className="eyebrow">
          {candidate.compatibility === "shared"
            ? "You both felt this"
            : "Your answers fit together"}
        </p>
        <h1 id="discussion-title">{candidate.theme}</h1>
        <blockquote>{candidate.discussionPrompt}</blockquote>

        <div className="conversation-invitation">
          <MessageCircleHeart size={19} aria-hidden="true" />
          <p>
            Put the screens down for a moment. Take this wherever the two of
            you want—there&apos;s nothing to type or record here.
          </p>
        </div>
      </div>

      <div className="ready-panel">
        <div className="ready-status" role="status" aria-live="polite">
          <span className={selfReady ? "ready-person is-ready" : "ready-person"}>
            {selfReady ? <Check size={15} aria-hidden="true" /> : null}
            You
          </span>
          <span className="ready-line" aria-hidden="true" />
          <span className={partnerReady ? "ready-person is-ready" : "ready-person"}>
            {partnerReady ? <Check size={15} aria-hidden="true" /> : null}
            {view.partner.name ?? "Partner"}
          </span>
        </div>

        <button
          type="button"
          className="primary-button"
          data-testid="discussion-ready"
          disabled={isSubmitting || selfReady}
          onClick={() => void onReady()}
        >
          {selfReady
            ? partnerReady
              ? "Opening the next spark…"
              : "Waiting for your partner…"
            : ordinal === total
              ? "We're ready for the afterglow"
              : "Ready for the next spark"}
          {!selfReady ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
        <p>Both of you must be ready before the room moves on.</p>
      </div>
    </section>
  );
}
