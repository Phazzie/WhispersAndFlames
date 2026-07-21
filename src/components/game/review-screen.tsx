"use client";

import { useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";

import type { BallotInput, ReviewRoomView } from "@/lib/game/contracts";
import { WaitingCard } from "@/components/game/waiting-card";

interface ReviewScreenProps {
  view: ReviewRoomView;
  isSubmitting: boolean;
  onSubmit: (input: BallotInput) => Promise<void> | void;
}

export function ReviewScreen({
  view,
  isSubmitting,
  onSubmit,
}: ReviewScreenProps) {
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  if (view.review.selfSubmitted) {
    return (
      <WaitingCard
        eyebrow="Your ballot is sealed"
        title="You chose your sparks."
        message="Nothing opens until your partner privately chooses it too. No individual passes or approvals are revealed."
        partnerReady={view.review.partnerSubmitted}
      />
    );
  }

  const candidates = view.review.candidates;
  const ballotComplete = candidates.every(
    (candidate) => typeof decisions[candidate.candidateId] === "boolean",
  );

  if (candidates.length === 0) {
    return (
      <WaitingCard
        eyebrow="A valid outcome"
        title="No shared spark surfaced this time."
        message="Ember won't invent common ground. The room is preparing a warm closing that honors the honesty you both brought."
      />
    );
  }

  return (
    <section className="review-flow" aria-labelledby="review-title">
      <header className="phase-intro phase-intro-centered">
        <p className="eyebrow">
          <Sparkles size={13} aria-hidden="true" /> Possible shared ground
        </p>
        <h1 id="review-title">Which sparks are you open to discussing?</h1>
        <p>
          These are neutral themes—not quotes or confessions. Choose privately.
          A spark opens only if you both say yes.
        </p>
      </header>

      <div className="review-list">
        {candidates.map((candidate, index) => {
          const decision = decisions[candidate.candidateId];
          return (
            <article
              key={candidate.candidateId}
              className="spark-card"
              data-testid={`review-card-${candidate.candidateId}`}
              aria-labelledby={`candidate-${candidate.candidateId}`}
            >
              <div className="spark-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="spark-content">
                <p className="card-kicker">
                  {candidate.compatibility === "shared"
                    ? "A shared note"
                    : "A complementary spark"}
                </p>
                <h2 id={`candidate-${candidate.candidateId}`}>
                  {candidate.theme}
                </h2>
                <p>{candidate.discussionPrompt}</p>
              </div>
              <div
                className="decision-group"
                role="group"
                aria-label={`Your private choice for ${candidate.theme}`}
              >
                <button
                  type="button"
                  className={decision === false ? "decision-button is-pass" : "decision-button"}
                  data-testid={`pass-${candidate.candidateId}`}
                  aria-pressed={decision === false}
                  onClick={() =>
                    setDecisions((current) => ({
                      ...current,
                      [candidate.candidateId]: false,
                    }))
                  }
                >
                  <X size={17} aria-hidden="true" />
                  Pass
                </button>
                <button
                  type="button"
                  className={decision === true ? "decision-button is-approve" : "decision-button"}
                  data-testid={`approve-${candidate.candidateId}`}
                  aria-pressed={decision === true}
                  onClick={() =>
                    setDecisions((current) => ({
                      ...current,
                      [candidate.candidateId]: true,
                    }))
                  }
                >
                  <Check size={17} aria-hidden="true" />
                  I&apos;m open
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="phase-action-row review-submit-row">
        <p aria-live="polite">
          {Object.keys(decisions).length} of {candidates.length} privately chosen
        </p>
        <button
          type="button"
          className="primary-button"
          data-testid="submit-ballot"
          disabled={isSubmitting || !ballotComplete}
          onClick={() =>
            void onSubmit({
              operationId: crypto.randomUUID(),
              decisions: candidates.map((candidate) => ({
                candidateId: candidate.candidateId,
                approve: decisions[candidate.candidateId] === true,
              })),
            })
          }
        >
          {isSubmitting ? "Sealing your choices…" : "Seal my choices"}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
