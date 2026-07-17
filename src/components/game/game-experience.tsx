"use client";

import { Flame, RefreshCw } from "lucide-react";

import { AmbientBackdrop } from "@/components/game/ambient-backdrop";
import { CompleteScreen } from "@/components/game/complete-screen";
import { DiscussionScreen } from "@/components/game/discussion-screen";
import { LandingScreen } from "@/components/game/landing-screen";
import { LobbyScreen } from "@/components/game/lobby-screen";
import { PreferencesScreen } from "@/components/game/preferences-screen";
import { QuestionScreen } from "@/components/game/question-screen";
import { ReviewScreen } from "@/components/game/review-screen";
import { RoomShell } from "@/components/game/room-shell";
import { StatusNotice } from "@/components/game/status-notice";
import { useRoomSession } from "@/components/game/use-room-session";

export function GameExperience() {
  const game = useRoomSession();

  if (game.isRestoring && !game.view) {
    return (
      <div className="app-root">
        <AmbientBackdrop />
        <main className="boot-screen" role="status" aria-live="polite">
          <span className="boot-flame" aria-hidden="true">
            <Flame size={30} fill="currentColor" />
          </span>
          <p className="eyebrow">Whispers &amp; Flames</p>
          <h1>Restoring your room…</h1>
          <p>Gathering the thread without reopening anything private.</p>
        </main>
      </div>
    );
  }

  if (!game.view && game.hasStoredSession) {
    return (
      <div className="app-root">
        <AmbientBackdrop />
        <main className="recovery-card">
          <span className="recovery-icon" aria-hidden="true">
            <Flame size={27} />
          </span>
          <p className="eyebrow">The room has gone quiet</p>
          <h1>We couldn&apos;t reach your flame.</h1>
          <p>
            This may be a brief connection pause—or the local demo server may
            have restarted and cleared its rooms.
          </p>
          {game.actionError ? (
            <StatusNotice tone="error">{game.actionError}</StatusNotice>
          ) : null}
          <div className="recovery-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void game.refresh()}
              disabled={game.isRestoring}
            >
              <RefreshCw
                size={17}
                className={game.isRestoring ? "spin" : undefined}
                aria-hidden="true"
              />
              Try the room again
            </button>
            <button
              type="button"
              className="quiet-button"
              onClick={game.forgetSession}
            >
              Forget this local session
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!game.view) {
    return (
      <div className="app-root">
        <AmbientBackdrop />
        <LandingScreen
          isSubmitting={game.isSubmitting}
          error={game.actionError}
          onClearError={game.clearError}
          onCreate={game.createRoom}
          onJoin={game.joinRoom}
        />
      </div>
    );
  }

  const view = game.view;

  return (
    <div className="app-root">
      <AmbientBackdrop />
      <RoomShell
        view={view}
        connection={game.connection}
        onForget={game.forgetSession}
      >
        {game.actionError ? (
          <StatusNotice tone="error" onDismiss={game.clearError}>
            {game.actionError}
          </StatusNotice>
        ) : null}

        {view.phase === "lobby" ? <LobbyScreen view={view} /> : null}
        {view.phase === "preferences" ? (
          <PreferencesScreen
            view={view}
            isSubmitting={game.isSubmitting}
            onSubmit={game.submitPreferences}
          />
        ) : null}
        {view.phase === "questions" ? (
          <QuestionScreen
            key={view.question.ordinal}
            view={view}
            isSubmitting={game.isSubmitting}
            onSubmit={game.submitAnswer}
          />
        ) : null}
        {view.phase === "review" ? (
          <ReviewScreen
            view={view}
            isSubmitting={game.isSubmitting}
            onSubmit={game.submitBallot}
          />
        ) : null}
        {view.phase === "discussion" ? (
          <DiscussionScreen
            view={view}
            isSubmitting={game.isSubmitting}
            onReady={game.markReady}
          />
        ) : null}
        {view.phase === "complete" ? (
          <CompleteScreen view={view} onRestart={game.forgetSession} />
        ) : null}
      </RoomShell>
    </div>
  );
}
