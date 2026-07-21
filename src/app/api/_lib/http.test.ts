import { describe, expect, it } from "vitest";

import {
  apiError,
  jsonNoStore,
  parseJson,
  requireBearerToken,
} from "@/app/api/_lib/http";
import { readyInputSchema } from "@/lib/game/contracts";
import { GameError } from "@/lib/game/errors";

describe("API HTTP boundary", () => {
  it("accepts a valid bearer token without exposing it in a response", () => {
    const request = new Request("http://localhost/api/rooms/id", {
      headers: { authorization: "Bearer opaque-private-token" },
    });
    expect(requireBearerToken(request)).toBe("opaque-private-token");
  });

  it("rejects malformed JSON and invalid bodies as stable bad requests", async () => {
    const malformed = new Request("http://localhost/api/rooms/id/ready", {
      method: "POST",
      body: "not-json",
    });
    await expect(parseJson(malformed, readyInputSchema)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    const invalid = new Request("http://localhost/api/rooms/id/ready", {
      method: "POST",
      body: JSON.stringify({ operationId: "not-a-uuid" }),
    });
    await expect(parseJson(invalid, readyInputSchema)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it.each([
    ["BAD_REQUEST", 400],
    ["UNAUTHORIZED", 401],
    ["ROOM_NOT_FOUND", 404],
    ["ROOM_FULL", 409],
    ["INVALID_PHASE", 409],
    ["ALREADY_SUBMITTED", 409],
    ["INTERNAL_ERROR", 500],
  ] as const)("maps %s to %i with no-store caching", async (code, status) => {
    const response = apiError(new GameError(code));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toMatchObject({ error: { code } });
  });

  it("applies no-store to successful JSON too", async () => {
    const response = jsonNoStore({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({ ok: true });
  });
});
