"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type {
  AnswerInput,
  BallotInput,
  CreateRoomInput,
  JoinRoomInput,
  PreferencesInput,
  RoomView,
} from "@/lib/game/contracts";
import { gameApi, GameApiError } from "@/components/game/api-client";
import {
  clearStoredRoomSession,
  readStoredRoomSession,
  type StoredRoomSession,
  writeStoredRoomSession,
} from "@/components/game/session-storage";

export type ConnectionState = "connected" | "reconnecting" | "offline";

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function initialStoredSession(): StoredRoomSession | null {
  return typeof window === "undefined" ? null : readStoredRoomSession();
}

function errorMessage(error: unknown): string {
  return error instanceof GameApiError
    ? error.message
    : "Something unexpected dimmed the room. Please try again.";
}

export function useRoomSession() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [session, setSession] =
    useState<StoredRoomSession | null>(initialStoredSession);
  const [view, setView] = useState<RoomView | null>(null);
  const [hasLoadedSnapshot, setHasLoadedSnapshot] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connection, setConnection] =
    useState<ConnectionState>("connected");
  const sessionRef = useRef<StoredRoomSession | null>(session);
  const viewRef = useRef<RoomView | null>(null);

  const acceptView = useCallback((nextView: RoomView) => {
    viewRef.current = nextView;
    setView((currentView) =>
      currentView && currentView.version > nextView.version
        ? currentView
        : nextView,
    );
  }, []);

  useEffect(() => {
    if (!hydrated || !session) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const poll = async () => {
      controller = new AbortController();

      try {
        const response = await gameApi.getRoom(
          session.roomId,
          session.playerToken,
          controller.signal,
        );
        if (!active) return;
        acceptView(response.view);
        setConnection("connected");
      } catch (error) {
        if (
          !active ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }

        setConnection((current) =>
          current === "connected" ? "reconnecting" : "offline",
        );
        if (!viewRef.current) {
          setActionError(errorMessage(error));
        }
      } finally {
        if (active) {
          setHasLoadedSnapshot(true);
          timer = setTimeout(poll, 1_000);
        }
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [acceptView, hydrated, session]);

  const establishSession = useCallback(
    (nextSession: StoredRoomSession, nextView: RoomView) => {
      writeStoredRoomSession(nextSession);
      sessionRef.current = nextSession;
      setSession(nextSession);
      acceptView(nextView);
      setHasLoadedSnapshot(true);
      setConnection("connected");
    },
    [acceptView],
  );

  const runEntryAction = useCallback(
    async (
      action: () => Promise<{
        playerToken: string;
        view: RoomView;
      }>,
    ) => {
      setIsSubmitting(true);
      setActionError(null);
      try {
        const response = await action();
        establishSession(
          {
            roomId: response.view.roomId,
            playerToken: response.playerToken,
          },
          response.view,
        );
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [establishSession],
  );

  const createRoom = useCallback(
    (input: CreateRoomInput) => runEntryAction(() => gameApi.createRoom(input)),
    [runEntryAction],
  );

  const joinRoom = useCallback(
    (input: JoinRoomInput) => runEntryAction(() => gameApi.joinRoom(input)),
    [runEntryAction],
  );

  const runRoomAction = useCallback(
    async (
      action: (
        activeSession: StoredRoomSession,
      ) => Promise<{ view: RoomView }>,
    ) => {
      const activeSession = sessionRef.current;
      if (!activeSession) return;

      setIsSubmitting(true);
      setActionError(null);
      try {
        const response = await action(activeSession);
        acceptView(response.view);
        setConnection("connected");
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [acceptView],
  );

  const submitPreferences = useCallback(
    (input: PreferencesInput) =>
      runRoomAction((activeSession) =>
        gameApi.submitPreferences(
          activeSession.roomId,
          activeSession.playerToken,
          input,
        ),
      ),
    [runRoomAction],
  );

  const submitAnswer = useCallback(
    (input: AnswerInput) =>
      runRoomAction((activeSession) =>
        gameApi.submitAnswer(
          activeSession.roomId,
          activeSession.playerToken,
          input,
        ),
      ),
    [runRoomAction],
  );

  const submitBallot = useCallback(
    (input: BallotInput) =>
      runRoomAction((activeSession) =>
        gameApi.submitBallot(
          activeSession.roomId,
          activeSession.playerToken,
          input,
        ),
      ),
    [runRoomAction],
  );

  const markReady = useCallback(
    () =>
      runRoomAction((activeSession) =>
        gameApi.markReady(activeSession.roomId, activeSession.playerToken, {
          operationId: crypto.randomUUID(),
        }),
      ),
    [runRoomAction],
  );

  const refresh = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;

    setIsRefreshing(true);
    setActionError(null);
    try {
      const response = await gameApi.getRoom(
        activeSession.roomId,
        activeSession.playerToken,
      );
      acceptView(response.view);
      setConnection("connected");
    } catch (error) {
      setConnection("offline");
      setActionError(errorMessage(error));
    } finally {
      setHasLoadedSnapshot(true);
      setIsRefreshing(false);
    }
  }, [acceptView]);

  const forgetSession = useCallback(() => {
    clearStoredRoomSession();
    sessionRef.current = null;
    viewRef.current = null;
    setSession(null);
    setView(null);
    setActionError(null);
    setConnection("connected");
    setHasLoadedSnapshot(false);
    setIsRefreshing(false);
  }, []);

  const clearError = useCallback(() => setActionError(null), []);

  return {
    view,
    hasStoredSession: Boolean(session),
    isRestoring:
      !hydrated || isRefreshing || (Boolean(session) && !hasLoadedSnapshot),
    isSubmitting,
    actionError,
    connection,
    createRoom,
    joinRoom,
    submitPreferences,
    submitAnswer,
    submitBallot,
    markReady,
    refresh,
    forgetSession,
    clearError,
  };
}
