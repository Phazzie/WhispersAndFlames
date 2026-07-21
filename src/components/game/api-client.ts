import type {
  AnswerInput,
  ApiErrorResponse,
  BallotInput,
  CreateRoomInput,
  JoinRoomInput,
  PreferencesInput,
  ReadyInput,
  SessionResponse,
  ViewResponse,
} from "@/lib/game/contracts";

export class GameApiError extends Error {
  readonly code: ApiErrorResponse["error"]["code"] | "NETWORK_ERROR";
  readonly status: number;

  constructor(
    message: string,
    code: GameApiError["code"] = "NETWORK_ERROR",
    status = 0,
  ) {
    super(message);
    this.name = "GameApiError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  playerToken?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function requestJson<T>(
  path: string,
  { method = "GET", playerToken, body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(playerToken
          ? { Authorization: `Bearer ${playerToken}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      referrerPolicy: "no-referrer",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new GameApiError(
      "The flame flickered out for a moment. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const apiError = payload as ApiErrorResponse | null;
    const message =
      apiError?.error?.message ??
      "Something interrupted the room. Please try once more.";
    const code = apiError?.error?.code ?? "NETWORK_ERROR";
    throw new GameApiError(message, code, response.status);
  }

  if (payload === null) {
    throw new GameApiError(
      "The room sent back an empty response. Please try again.",
      "INTERNAL_ERROR",
      response.status,
    );
  }

  return payload as T;
}

function roomPath(roomId: string, action?: string): string {
  const base = `/api/rooms/${encodeURIComponent(roomId)}`;
  return action ? `${base}/${action}` : base;
}

export const gameApi = {
  createRoom(input: CreateRoomInput, signal?: AbortSignal) {
    return requestJson<SessionResponse>("/api/rooms", {
      method: "POST",
      body: input,
      signal,
    });
  },

  joinRoom(input: JoinRoomInput, signal?: AbortSignal) {
    return requestJson<SessionResponse>("/api/rooms/join", {
      method: "POST",
      body: input,
      signal,
    });
  },

  getRoom(roomId: string, playerToken: string, signal?: AbortSignal) {
    return requestJson<ViewResponse>(roomPath(roomId), {
      playerToken,
      signal,
    });
  },

  submitPreferences(
    roomId: string,
    playerToken: string,
    input: PreferencesInput,
  ) {
    return requestJson<ViewResponse>(roomPath(roomId, "preferences"), {
      method: "POST",
      playerToken,
      body: input,
    });
  },

  submitAnswer(roomId: string, playerToken: string, input: AnswerInput) {
    return requestJson<ViewResponse>(roomPath(roomId, "answer"), {
      method: "POST",
      playerToken,
      body: input,
    });
  },

  submitBallot(roomId: string, playerToken: string, input: BallotInput) {
    return requestJson<ViewResponse>(roomPath(roomId, "ballot"), {
      method: "POST",
      playerToken,
      body: input,
    });
  },

  markReady(roomId: string, playerToken: string, input: ReadyInput) {
    return requestJson<ViewResponse>(roomPath(roomId, "ready"), {
      method: "POST",
      playerToken,
      body: input,
    });
  },
};
