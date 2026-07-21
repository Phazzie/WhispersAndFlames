"use client";

import { useState } from "react";
import {
  ArrowRight,
  Eye,
  Flame,
  Heart,
  MessageCircleHeart,
  Sparkles,
} from "lucide-react";

import type {
  CategoryId,
  IntensityId,
  PreferencesInput,
  PreferencesRoomView,
} from "@/lib/game/contracts";
import { WaitingCard } from "@/components/game/waiting-card";

interface PreferencesScreenProps {
  view: PreferencesRoomView;
  isSubmitting: boolean;
  onSubmit: (input: PreferencesInput) => Promise<void> | void;
}

const CATEGORIES = [
  {
    id: "connection",
    label: "Connection",
    description: "The moments that make you feel chosen and understood.",
    icon: Heart,
  },
  {
    id: "attraction",
    label: "Attraction",
    description: "What catches your eye and keeps pulling you closer.",
    icon: Eye,
  },
  {
    id: "playfulness",
    label: "Playfulness",
    description: "Teasing, laughter, and the chemistry of not being serious.",
    icon: Sparkles,
  },
  {
    id: "fantasy",
    label: "Fantasy",
    description: "Curiosities you might enjoy naming together.",
    icon: MessageCircleHeart,
  },
] as const satisfies ReadonlyArray<{
  id: CategoryId;
  label: string;
  description: string;
  icon: typeof Heart;
}>;

const INTENSITIES = [
  {
    id: "mild",
    label: "Glow",
    note: "Warm, flirty, emotionally revealing",
    flames: 1,
  },
  {
    id: "medium",
    label: "Smolder",
    note: "Sensual, suggestive, and specific",
    flames: 2,
  },
  {
    id: "hot",
    label: "Blaze",
    note: "Direct adult desire, still thoughtful",
    flames: 3,
  },
] as const satisfies ReadonlyArray<{
  id: IntensityId;
  label: string;
  note: string;
  flames: number;
}>;

export function PreferencesScreen({
  view,
  isSubmitting,
  onSubmit,
}: PreferencesScreenProps) {
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [intensity, setIntensity] = useState<IntensityId>("mild");

  if (view.preferences.selfSubmitted) {
    return (
      <WaitingCard
        eyebrow={
          view.preferences.retryReason
            ? "A fresh private choice"
            : "Your choices are sealed"
        }
        title="The mood is set."
        message={
          view.preferences.retryReason
            ? "Your first picks did not overlap, so both private lists were cleared. Your new selections stay sealed while your partner chooses again."
            : "Your selections stay yours. When both of you are ready, Ember will weave the first question from only what overlaps."
        }
        partnerReady={view.preferences.partnerSubmitted}
      />
    );
  }

  const toggleCategory = (category: CategoryId) => {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  return (
    <section className="preferences-flow" aria-labelledby="preferences-title">
      <header className="phase-intro phase-intro-centered">
        <p className="eyebrow">Private to you</p>
        <h1 id="preferences-title">What kind of spark are you open to?</h1>
        <p>
          Choose every lane that feels welcome tonight. Your partner sees only
          when you&apos;re done—not what you chose.
        </p>
        {view.preferences.retryReason ? (
          <p className="status-notice" role="status">
            Your first choices did not overlap. Both private lists were cleared,
            so choose again—nothing about either list was revealed.
          </p>
        ) : null}
      </header>

      <fieldset className="preference-fieldset">
        <legend>Choose one or more themes</legend>
        <div className="category-grid">
          {CATEGORIES.map(({ id, label, description, icon: Icon }) => {
            const selected = categories.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={selected ? "category-card is-selected" : "category-card"}
                data-testid={`category-${id}`}
                aria-pressed={selected}
                onClick={() => toggleCategory(id)}
              >
                <span className="category-icon" aria-hidden="true">
                  <Icon size={21} strokeWidth={1.5} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <span className="selection-mark" aria-hidden="true">
                  {selected ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="preference-fieldset">
        <legend>Choose your intensity</legend>
        <div className="intensity-grid">
          {INTENSITIES.map(({ id, label, note, flames }) => (
            <label
              key={id}
              className={
                intensity === id ? "intensity-card is-selected" : "intensity-card"
              }
              data-testid={`intensity-${id}`}
            >
              <input
                type="radio"
                name="intensity"
                value={id}
                checked={intensity === id}
                onChange={() => setIntensity(id)}
              />
              <span className="flame-meter" aria-hidden="true">
                {[1, 2, 3].map((flame) => (
                  <Flame
                    key={flame}
                    size={16}
                    className={flame <= flames ? "is-lit" : undefined}
                    fill={flame <= flames ? "currentColor" : "none"}
                  />
                ))}
              </span>
              <strong>{label}</strong>
              <small>{note}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="phase-action-row">
        <p>
          We&apos;ll use the gentler of your two intensity choices. Neither choice
          is revealed.
        </p>
        <button
          type="button"
          className="primary-button"
          data-testid="submit-preferences"
          disabled={isSubmitting || categories.length === 0}
          onClick={() =>
            void onSubmit({
              operationId: crypto.randomUUID(),
              expectedVersion: view.version,
              categories,
              intensity,
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
