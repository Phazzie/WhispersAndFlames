import type { ZodType } from "zod";

import type { ApiErrorResponse } from "@/lib/game/contracts";
import { GameError } from "@/lib/game/errors";

export interface RoomRouteContext {
  params: Promise<{ roomId: string }>;
}

const statusByCode: Record<ApiErrorResponse["error"]["code"], number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  ROOM_NOT_FOUND: 404,
  ROOM_FULL: 409,
  INVALID_PHASE: 409,
  ALREADY_SUBMITTED: 409,
  INTERNAL_ERROR: 500,
};

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new GameError("BAD_REQUEST");
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new GameError("BAD_REQUEST");
  }
  return parsed.data;
}

export function requireBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    throw new GameError("UNAUTHORIZED");
  }
  return match[1];
}

export function jsonNoStore(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: noStoreHeaders });
}

export function apiError(error: unknown): Response {
  const gameError =
    error instanceof GameError ? error : new GameError("INTERNAL_ERROR");
  const body: ApiErrorResponse = {
    error: {
      code: gameError.code,
      message: gameError.message,
    },
  };
  return jsonNoStore(body, statusByCode[gameError.code]);
}
