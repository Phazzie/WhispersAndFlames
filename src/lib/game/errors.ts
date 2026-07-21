import type { ApiErrorResponse } from "@/lib/game/contracts";

export type GameErrorCode = ApiErrorResponse["error"]["code"];

const defaultMessages: Record<GameErrorCode, string> = {
  BAD_REQUEST: "The request was invalid.",
  ROOM_NOT_FOUND: "That room could not be found.",
  ROOM_FULL: "That room already has two players.",
  UNAUTHORIZED: "This player session is not authorized for that room.",
  INVALID_PHASE: "That action is not available right now.",
  ALREADY_SUBMITTED: "Your response for this step is already locked in.",
  STALE_COMMAND: "The room has already moved forward. Please refresh to continue.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export class GameError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message = defaultMessages[code]) {
    super(message);
    this.name = "GameError";
    this.code = code;
  }
}

export function internalGameError(): GameError {
  return new GameError("INTERNAL_ERROR");
}
