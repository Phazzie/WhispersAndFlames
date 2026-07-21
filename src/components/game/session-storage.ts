const SESSION_STORAGE_KEY = "whispers-and-flames:room-session";

export interface StoredRoomSession {
  roomId: string;
  playerToken: string;
}

function isStoredRoomSession(value: unknown): value is StoredRoomSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.roomId === "string" &&
    candidate.roomId.length > 0 &&
    typeof candidate.playerToken === "string" &&
    candidate.playerToken.length > 0
  );
}

export function readStoredRoomSession(
  storage: Storage = window.sessionStorage,
): StoredRoomSession | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredRoomSession(parsed)
      ? { roomId: parsed.roomId, playerToken: parsed.playerToken }
      : null;
  } catch {
    return null;
  }
}

export function writeStoredRoomSession(
  session: StoredRoomSession,
  storage: Storage = window.sessionStorage,
): void {
  storage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      roomId: session.roomId,
      playerToken: session.playerToken,
    }),
  );
}

export function clearStoredRoomSession(
  storage: Storage = window.sessionStorage,
): void {
  storage.removeItem(SESSION_STORAGE_KEY);
}
