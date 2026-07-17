"use client";

import { useState } from "react";
import { ArrowRight, Lock, SkipForward } from "lucide-react";

import type { AnswerInput, QuestionsRoomView } from "@/lib/game/contracts";
import { WaitingCard } from "@/components/game/waiting-card";

interface QuestionScreenProps {
  view: QuestionsRoomView;
  isSubmitting: boolean;
  onSubmit: (input: AnswerInput) => Promise<void> | void;
}

const CATEGORY_LABELS = {
  connection: "Connection",
  attraction: "Attraction",
  playfulness: "Playfulness",
  fantasy: "Fantasy",
} as const;

export function QuestionScreen({
  view,
  isSubmitting,
  onSubmit,
}: QuestionScreenProps) {
  const [answer, setAnswer] = useState("");

  if (view.question.selfSubmitted) {
    return (
      <WaitingCard
        eyebrow={`Whisper ${view.question.ordinal} of ${view.question.total} is sealed`}
        title="Your answer is safely tucked away."
        message="Your partner can see that you're ready, never what you wrote or whether you skipped."
        partnerReady={view.question.partnerSubmitted}
      />
    );
  }

  const answerLength = answer.length;
  const canSubmit = answer.trim().length > 0 && answerLength <= 1_000;
  const progress = (view.question.ordinal / view.question.total) * 100;

  return (
    <section className="question-flow" aria-labelledby="question-title">
      <div className="question-progress" aria-label="Game progress">
        <div className="progress-copy">
          <span>
            Whisper {view.question.ordinal} of {view.question.total}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={view.question.total}
          aria-valuenow={view.question.ordinal}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="question-card">
        <div className="question-meta">
          <span>{CATEGORY_LABELS[view.question.category]}</span>
          <span className="private-chip">
            <Lock size={12} aria-hidden="true" /> just for you
          </span>
        </div>
        <h1 id="question-title">{view.question.text}</h1>
        <p className="question-nudge">
          Specific beats perfect. Write the detail that first came to mind.
        </p>

        <label className="field-label" htmlFor="private-answer">
          Your private answer
        </label>
        <textarea
          id="private-answer"
          data-testid="answer-textarea"
          className="answer-textarea"
          maxLength={1_000}
          rows={7}
          placeholder="Say it the way you would if nobody could interrupt…"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={isSubmitting}
        />
        <div className="textarea-meta">
          <span aria-live="polite">{answerLength} / 1,000</span>
          <span>Your partner never receives this text.</span>
        </div>
      </div>

      <div className="question-actions">
        <button
          type="button"
          className="quiet-button"
          data-testid="skip-answer"
          disabled={isSubmitting}
          onClick={() =>
            void onSubmit({
              operationId: crypto.randomUUID(),
              skip: true,
            })
          }
        >
          <SkipForward size={17} aria-hidden="true" />
          Skip privately
        </button>
        <button
          type="button"
          className="primary-button"
          data-testid="submit-answer"
          disabled={isSubmitting || !canSubmit}
          onClick={() =>
            void onSubmit({
              operationId: crypto.randomUUID(),
              answer: answer.trim(),
            })
          }
        >
          {isSubmitting ? "Sealing your answer…" : "Seal this answer"}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
