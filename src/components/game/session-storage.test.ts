import { describe, expect, it } from "vitest";

import {
  clearStoredRoomSession,
  readStoredRoomSession,
  writeStoredRoomSession,
} from "@/components/game/session-storage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("room session storage", () => {
  it("persists only the room ID and player bearer token", () => {
    const storage = new MemoryStorage();

    writeStoredRoomSession(
      { roomId: "room-123", playerToken: "player-secret" },
      storage,
    );

    expect(storage.length).toBe(1);
    expect(readStoredRoomSession(storage)).toEqual({
      roomId: "room-123",
      playerToken: "player-secret",
    });

    const serialized = storage.getItem("whispers-and-flames:room-session");
    expect(serialized).not.toContain("answer");
    expect(serialized).not.toContain("preferences");
    expect(serialized).not.toContain("ballot");

    clearStoredRoomSession(storage);
    expect(readStoredRoomSession(storage)).toBeNull();
  });

  it("fails closed for malformed persisted state", () => {
    const storage = new MemoryStorage();
    storage.setItem("whispers-and-flames:room-session", "not-json");
    expect(readStoredRoomSession(storage)).toBeNull();

    storage.setItem(
      "whispers-and-flames:room-session",
      JSON.stringify({ roomId: "room-123" }),
    );
    expect(readStoredRoomSession(storage)).toBeNull();
  });
});
