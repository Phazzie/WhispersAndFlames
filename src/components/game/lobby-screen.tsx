"use client";

import { useState } from "react";
import { Check, Copy, Share2, UsersRound } from "lucide-react";

import type { LobbyRoomView } from "@/lib/game/contracts";

interface LobbyScreenProps {
  view: LobbyRoomView;
}

export function LobbyScreen({ view }: LobbyScreenProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(view.code);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2_000);
    } catch {
      setCopyState("error");
    }
  };

  const shareCode = async () => {
    const shareText = `Join my Whispers & Flames room with code ${view.code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Whispers & Flames",
          text: shareText,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyCode();
  };

  return (
    <section className="phase-grid lobby-grid" aria-labelledby="lobby-title">
      <div className="phase-intro">
        <p className="eyebrow">Your private room</p>
        <h1 id="lobby-title">One candle is lit.</h1>
        <p>
          Share this code with your partner. Once they arrive, you&apos;ll both
          choose the mood privately and the game will begin.
        </p>
      </div>

      <div className="room-code-card">
        <span className="card-kicker">Room code</span>
        <output
          className="room-code"
          data-testid="room-code"
          aria-label={`Room code ${view.code.split("").join(" ")}`}
        >
          {view.code}
        </output>
        <div className="code-actions">
          <button
            type="button"
            className="secondary-button"
            data-testid="copy-room-code"
            onClick={() => void copyCode()}
          >
            {copyState === "copied" ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Copy size={17} aria-hidden="true" />
            )}
            {copyState === "copied" ? "Copied" : "Copy code"}
          </button>
          <button
            type="button"
            className="secondary-button"
            data-testid="share-room-code"
            onClick={() => void shareCode()}
          >
            <Share2 size={17} aria-hidden="true" />
            Share
          </button>
        </div>
        {copyState === "error" ? (
          <p className="inline-error" role="alert">
            Copy didn&apos;t work here. Select the code above and copy it
            manually.
          </p>
        ) : null}
      </div>

      <div className="lobby-presence" role="status" aria-live="polite">
        <div className="seat-card is-present">
          <span className="seat-avatar">{view.self.name.slice(0, 1)}</span>
          <span>
            <strong>{view.self.name}</strong>
            <small>You&apos;re here</small>
          </span>
          <Check size={18} aria-label="Ready" />
        </div>
        <span className="presence-thread" aria-hidden="true" />
        <div className="seat-card">
          <span className="seat-avatar seat-avatar-empty">
            <UsersRound size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>Second player</strong>
            <small>Waiting for them to join…</small>
          </span>
          <span className="presence-dot" aria-hidden="true" />
        </div>
      </div>

      <p className="privacy-footnote">
        The room code admits one partner. It is never used as authorization
        after they join.
      </p>
    </section>
  );
}
