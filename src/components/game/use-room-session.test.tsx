// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useRoomSession } from "@/components/game/use-room-session";
import { gameApi, GameApiError } from "@/components/game/api-client";
import { writeStoredRoomSession, clearStoredRoomSession } from "@/components/game/session-storage";
import type { QuestionsRoomView } from "@/lib/game/contracts";

vi.mock("@/components/game/api-client", () => {
  return {
    GameApiError: class extends Error {
      readonly code: string;
      readonly status: number;
      constructor(message: string, code = "NETWORK_ERROR", status = 0) {
        super(message);
        this.code = code;
        this.status = status;
      }
    },
    gameApi: {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      getRoom: vi.fn(),
      submitPreferences: vi.fn(),
      submitAnswer: vi.fn(),
      submitBallot: vi.fn(),
      markReady: vi.fn(),
    },
  };
});

const mockQuestionView: QuestionsRoomView = {
  roomId: "room-abc",
  code: "COFFEE",
  version: 5,
  self: { name: "Avery", seat: "host" },
  partner: { joined: true, name: "Jordan" },
  busy: null,
  aiMode: "fallback",
  phase: "questions",
  question: {
    ordinal: 1,
    total: 8,
    text: "How do you feel?",
    category: "connection",
    selfSubmitted: false,
    partnerSubmitted: false,
  },
};

describe("useRoomSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStoredRoomSession();
  });

  it("Client invariant: retains same operationId for a given step across retries", async () => {
    writeStoredRoomSession({ roomId: "room-abc", playerToken: "token-host" });

    // Mock initial fetch and answer submit
    vi.mocked(gameApi.getRoom).mockResolvedValue({ view: mockQuestionView });
    vi.mocked(gameApi.submitAnswer).mockRejectedValue(new GameApiError("Timeout", "NETWORK_ERROR"));

    const { result } = renderHook(() => useRoomSession());

    // Wait for the hydration and poll effect to load view
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.view?.phase).toBe("questions");

    // Submit answer which fails
    await act(async () => {
      await result.current.submitAnswer({
        operationId: "ignored",
        expectedVersion: 5,
        ordinal: 1,
        answer: "Initial attempt",
      });
    });

    // Check that submitAnswer was called with some operationId
    expect(gameApi.submitAnswer).toHaveBeenCalledOnce();
    const firstOpId = vi.mocked(gameApi.submitAnswer).mock.calls[0][2].operationId;

    // Retry submit answer
    await act(async () => {
      await result.current.submitAnswer({
        operationId: "ignored-again",
        expectedVersion: 5,
        ordinal: 1,
        answer: "Retry attempt",
      });
    });

    expect(gameApi.submitAnswer).toHaveBeenCalledTimes(2);
    const secondOpId = vi.mocked(gameApi.submitAnswer).mock.calls[1][2].operationId;

    // The operation ID MUST be retained across these attempts!
    expect(firstOpId).toBe(secondOpId);
  });

  it("Client invariant: stale room version (STALE_COMMAND) triggers refresh of view snapshot", async () => {
    writeStoredRoomSession({ roomId: "room-abc", playerToken: "token-host" });

    vi.mocked(gameApi.getRoom).mockResolvedValueOnce({ view: mockQuestionView });
    vi.mocked(gameApi.submitAnswer).mockRejectedValueOnce(
      new GameApiError("The room has moved forward", "STALE_COMMAND", 409),
    );

    const advancedQuestionView = {
      ...mockQuestionView,
      version: 6,
      question: { ...mockQuestionView.question, ordinal: 2 },
    };
    vi.mocked(gameApi.getRoom).mockResolvedValueOnce({ view: advancedQuestionView });

    const { result } = renderHook(() => useRoomSession());

    await act(async () => {
      await Promise.resolve();
    });

    // Attempt mutation that fails with STALE_COMMAND
    await act(async () => {
      await result.current.submitAnswer({
        operationId: "foo",
        expectedVersion: 5,
        ordinal: 1,
        answer: "Answer on old view",
      });
    });

    // It should have caught STALE_COMMAND and fetched current view
    expect(gameApi.getRoom).toHaveBeenCalledTimes(2);
    expect(result.current.view?.version).toBe(6);
    expect(result.current.view?.phase).toBe("questions");
    if (result.current.view?.phase === "questions") {
      expect(result.current.view.question.ordinal).toBe(2);
    }
  });

  it("Client invariant: older room version projections from late-responses are discarded", async () => {
    writeStoredRoomSession({ roomId: "room-abc", playerToken: "token-host" });

    // Initial load view is version 5
    vi.mocked(gameApi.getRoom).mockResolvedValueOnce({ view: mockQuestionView });

    const { result } = renderHook(() => useRoomSession());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.view?.version).toBe(5);

    // Advanced view is version 7
    const newerView = { ...mockQuestionView, version: 7 };
    await act(async () => {
      // Simulate polling or user action receiving version 7
      // In use-room-session.ts, we can update the state by calling the internal acceptView or simulating it
      // Let's call refresh to get a newer view, but mock it first
      vi.mocked(gameApi.getRoom).mockResolvedValueOnce({ view: newerView });
      await result.current.refresh();
    });

    expect(result.current.view?.version).toBe(7);

    // Simulate receiving a late response containing older version 6
    const olderView = { ...mockQuestionView, version: 6 };
    act(() => {
      // Trigger a poll or mutation response that returns olderView
      // We can test this by calling an action or verifying that acceptView won't set older version
      // Let's directly verify by calling refresh with an older view mocked
      vi.mocked(gameApi.getRoom).mockResolvedValueOnce({ view: olderView });
    });

    await act(async () => {
      await result.current.refresh();
    });

    // The newer view (version 7) MUST NOT be overwritten by the late older response (version 6)!
    expect(result.current.view?.version).toBe(7);
  });
});
