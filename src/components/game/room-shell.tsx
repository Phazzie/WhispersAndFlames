import { LoaderCircle, RotateCcw, Sparkles } from "lucide-react";

import type { RoomView } from "@/lib/game/contracts";
import { BrandMark } from "@/components/game/brand-mark";
import type { ConnectionState } from "@/components/game/use-room-session";

interface RoomShellProps {
  view: RoomView;
  connection: ConnectionState;
  children: React.ReactNode;
  onForget: () => void;
}

const PHASE_LABELS: Record<RoomView["phase"], string> = {
  lobby: "The antechamber",
  preferences: "Set the mood",
  questions: "Private whispers",
  review: "Shared sparks",
  discussion: "Between you",
  complete: "Afterglow",
};

const BUSY_LABELS = {
  weaving_questions: "Ember is weaving your questions…",
  finding_sparks: "Finding the threads you share…",
  writing_summary: "Scribe is gathering the afterglow…",
} as const;

export function RoomShell({
  view,
  connection,
  children,
  onForget,
}: RoomShellProps) {
  return (
    <div className="room-frame">
      <header className="room-header">
        <BrandMark compact />
        <div className="room-meta" aria-label="Current room">
          <span>{PHASE_LABELS[view.phase]}</span>
          <span aria-hidden="true">·</span>
          <span>Room {view.code}</span>
        </div>
        <button
          type="button"
          className="header-action"
          onClick={onForget}
          aria-label="Forget this local session and return home"
          title="Leave this screen"
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Start over</span>
        </button>
      </header>

      {connection !== "connected" ? (
        <div className="connection-ribbon" role="status" aria-live="polite">
          <span className="presence-dot" aria-hidden="true" />
          {connection === "reconnecting"
            ? "Reconnecting to the room…"
            : "Connection is quiet. We’ll keep trying."}
        </div>
      ) : null}

      {view.busy ? (
        <div className="ai-ribbon" role="status" aria-live="polite">
          <LoaderCircle className="spin" size={16} aria-hidden="true" />
          <span>{BUSY_LABELS[view.busy]}</span>
          {view.aiMode === "fallback" ? (
            <span className="fallback-note">
              <Sparkles size={13} aria-hidden="true" /> curated mode
            </span>
          ) : null}
        </div>
      ) : null}

      <main className="room-main">{children}</main>

      <footer className="room-footer">
        <span>
          {view.self.name} · {view.self.seat === "host" ? "Room maker" : "Guest"}
        </span>
        <span>Private by design</span>
      </footer>
    </div>
  );
}
