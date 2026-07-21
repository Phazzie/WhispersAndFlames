"use client";

import { useId, useState } from "react";
import { ArrowRight, KeyRound, Sparkles, UsersRound } from "lucide-react";

import type {
  CreateRoomInput,
  JoinRoomInput,
} from "@/lib/game/contracts";
import { BrandMark } from "@/components/game/brand-mark";
import { PrivacyConsentFields } from "@/components/game/privacy-consent-fields";
import { StatusNotice } from "@/components/game/status-notice";

interface LandingScreenProps {
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
  onCreate: (input: CreateRoomInput) => Promise<void> | void;
  onJoin: (input: JoinRoomInput) => Promise<void> | void;
}

type EntryMode = "create" | "join";

interface ConsentState {
  adultConfirmed: boolean;
  aiConsent: boolean;
}

const EMPTY_CONSENT: ConsentState = {
  adultConfirmed: false,
  aiConsent: false,
};

export function LandingScreen({
  isSubmitting,
  error,
  onClearError,
  onCreate,
  onJoin,
}: LandingScreenProps) {
  const [mode, setMode] = useState<EntryMode>("create");
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [code, setCode] = useState("");
  const [createConsent, setCreateConsent] =
    useState<ConsentState>(EMPTY_CONSENT);
  const [joinConsent, setJoinConsent] =
    useState<ConsentState>(EMPTY_CONSENT);
  const tabPrefix = useId();

  const switchMode = (nextMode: EntryMode) => {
    setMode(nextMode);
    onClearError();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      switchMode(mode === "create" ? "join" : "create");
      const otherTab = document.getElementById(
        `${tabPrefix}-${mode === "create" ? "join" : "create"}-tab`,
      );
      otherTab?.focus();
    }
  };

  return (
    <main className="landing-shell">
      <section className="landing-story" aria-labelledby="landing-title">
        <BrandMark />
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={13} aria-hidden="true" /> A private game for two
          </p>
          <h1 id="landing-title">
            Say what you&apos;ve been
            <em> quietly wondering.</em>
          </h1>
          <p className="hero-lede">
            Eight private questions. Shared sparks only when you both feel
            them. A little more honesty, with just enough mischief.
          </p>
        </div>

        <ol className="ritual-steps" aria-label="How the game works">
          <li>
            <span>01</span>
            <p>
              <strong>Answer apart</strong>
              Your words stay sealed from your partner.
            </p>
          </li>
          <li>
            <span>02</span>
            <p>
              <strong>Meet in the middle</strong>
              Ember surfaces only themes supported by you both.
            </p>
          </li>
          <li>
            <span>03</span>
            <p>
              <strong>Choose the spark</strong>
              A conversation opens only after two private yeses.
            </p>
          </li>
        </ol>

        <p className="demo-note">
          This guest preview lives only while the demo server is running.
        </p>
      </section>

      <section className="entry-card" aria-label="Enter the game">
        <div className="entry-card-glow" aria-hidden="true" />
        <div className="entry-tabs" role="tablist" aria-label="Room entry">
          <button
            id={`${tabPrefix}-create-tab`}
            data-testid="landing-create-tab"
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            aria-controls={`${tabPrefix}-create-panel`}
            tabIndex={mode === "create" ? 0 : -1}
            onClick={() => switchMode("create")}
            onKeyDown={handleTabKeyDown}
          >
            <UsersRound size={16} aria-hidden="true" />
            Create a room
          </button>
          <button
            id={`${tabPrefix}-join-tab`}
            data-testid="landing-join-tab"
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            aria-controls={`${tabPrefix}-join-panel`}
            tabIndex={mode === "join" ? 0 : -1}
            onClick={() => switchMode("join")}
            onKeyDown={handleTabKeyDown}
          >
            <KeyRound size={16} aria-hidden="true" />
            Join with a code
          </button>
        </div>

        {error ? (
          <StatusNotice tone="error" onDismiss={onClearError}>
            {error}
          </StatusNotice>
        ) : null}

        {mode === "create" ? (
          <form
            id={`${tabPrefix}-create-panel`}
            className="entry-form"
            role="tabpanel"
            aria-labelledby={`${tabPrefix}-create-tab`}
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !createName.trim() ||
                !createConsent.adultConfirmed ||
                !createConsent.aiConsent
              ) {
                return;
              }
              void onCreate({
                name: createName.trim(),
                adultConfirmed: createConsent.adultConfirmed,
                aiConsent: createConsent.aiConsent,
              });
            }}
          >
            <div className="form-heading">
              <p className="eyebrow">Light the first candle</p>
              <h2>Make space for the two of you.</h2>
              <p>You&apos;ll get a six-character code to share privately.</p>
            </div>

            <label className="field-label" htmlFor="create-name">
              What should we call you?
            </label>
            <input
              id="create-name"
              data-testid="create-name-input"
              className="text-input"
              name="name"
              type="text"
              autoComplete="nickname"
              maxLength={30}
              placeholder="Your first name or nickname"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              required
            />

            <PrivacyConsentFields
              prefix="create"
              adultConfirmed={createConsent.adultConfirmed}
              aiConsent={createConsent.aiConsent}
              onAdultChange={(checked) =>
                setCreateConsent((current) => ({
                  ...current,
                  adultConfirmed: checked,
                }))
              }
              onAiConsentChange={(checked) =>
                setCreateConsent((current) => ({
                  ...current,
                  aiConsent: checked,
                }))
              }
            />

            <button
              data-testid="create-room-submit"
              className="primary-button"
              type="submit"
              disabled={
                isSubmitting ||
                !createName.trim() ||
                !createConsent.adultConfirmed ||
                !createConsent.aiConsent
              }
            >
              {isSubmitting ? "Creating your room…" : "Create our room"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <form
            id={`${tabPrefix}-join-panel`}
            className="entry-form"
            role="tabpanel"
            aria-labelledby={`${tabPrefix}-join-tab`}
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !joinName.trim() ||
                code.length !== 6 ||
                !joinConsent.adultConfirmed ||
                !joinConsent.aiConsent
              ) {
                return;
              }
              void onJoin({
                name: joinName.trim(),
                code: code.trim().toUpperCase(),
                adultConfirmed: joinConsent.adultConfirmed,
                aiConsent: joinConsent.aiConsent,
              });
            }}
          >
            <div className="form-heading">
              <p className="eyebrow">Step into their glow</p>
              <h2>Your room is waiting.</h2>
              <p>Enter the code your partner shared with you.</p>
            </div>

            <label className="field-label" htmlFor="join-name">
              What should we call you?
            </label>
            <input
              id="join-name"
              data-testid="join-name-input"
              className="text-input"
              name="name"
              type="text"
              autoComplete="nickname"
              maxLength={30}
              placeholder="Your first name or nickname"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              required
            />

            <label className="field-label" htmlFor="room-code">
              Six-character room code
            </label>
            <input
              id="room-code"
              data-testid="room-code-input"
              className="text-input code-input"
              name="code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              minLength={6}
              maxLength={6}
              pattern="[A-Za-z0-9]{6}"
              placeholder="EMBER7"
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6),
                )
              }
              required
            />

            <PrivacyConsentFields
              prefix="join"
              adultConfirmed={joinConsent.adultConfirmed}
              aiConsent={joinConsent.aiConsent}
              onAdultChange={(checked) =>
                setJoinConsent((current) => ({
                  ...current,
                  adultConfirmed: checked,
                }))
              }
              onAiConsentChange={(checked) =>
                setJoinConsent((current) => ({
                  ...current,
                  aiConsent: checked,
                }))
              }
            />

            <button
              data-testid="join-room-submit"
              className="primary-button"
              type="submit"
              disabled={
                isSubmitting ||
                !joinName.trim() ||
                code.length !== 6 ||
                !joinConsent.adultConfirmed ||
                !joinConsent.aiConsent
              }
            >
              {isSubmitting ? "Entering the room…" : "Join the room"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
