import { afterEach, describe, expect, it, vi } from "vitest";

import { gameApi, GameApiError } from "@/components/game/api-client";
import type { LobbyRoomView } from "@/lib/game/contracts";

const LOBBY_VIEW: LobbyRoomView = {
  roomId: "room/with space",
  code: "EMBER7",
  version: 1,
  self: { name: "Em", seat: "host" },
  partner: { joined: false, name: null },
  busy: null,
  aiMode: "fallback",
  phase: "lobby",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("game API client", () => {
  it("keeps the bearer token out of snapshot URLs and disables caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ view: LOBBY_VIEW }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await gameApi.getRoom(LOBBY_VIEW.roomId, "player-secret");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/rooms/room%2Fwith%20space");
    expect(path).not.toContain("player-secret");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer player-secret",
      Accept: "application/json",
    });
    expect(options.cache).toBe("no-store");
    expect(options.referrerPolicy).toBe("no-referrer");
  });

  it("uses the frozen answer endpoint and operation payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ view: LOBBY_VIEW }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await gameApi.submitAnswer("room-123", "player-secret", {
      operationId: "00000000-0000-4000-8000-000000000001",
      expectedVersion: 5,
      ordinal: 1,
      skip: true,
    });

    const [path, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/rooms/room-123/answer");
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      operationId: "00000000-0000-4000-8000-000000000001",
      expectedVersion: 5,
      ordinal: 1,
      skip: true,
    });
  });

  it("turns stable API failures into a safe typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "ROOM_NOT_FOUND", message: "That room is gone." },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(gameApi.getRoom("missing", "player-secret")).rejects.toEqual(
      expect.objectContaining<GameApiError>({
        name: "GameApiError",
        code: "ROOM_NOT_FOUND",
        status: 404,
        message: "That room is gone.",
      }),
    );
  });
});
