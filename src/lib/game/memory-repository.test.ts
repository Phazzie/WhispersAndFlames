import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { GAME_QUESTION_COUNT, type RoomView } from "@/lib/game/contracts";
import { GameError } from "@/lib/game/errors";
import { MemoryGameRepository } from "@/lib/game/memory-repository";
import type { GameAiPort, MatchCandidateProposal } from "@/lib/game/ports";

const questions = Array.from({ length: GAME_QUESTION_COUNT }, (_, index) => ({
  text: `Private question ${index + 1}?`,
  category: "connection" as const,
}));

function createAi(candidates: MatchCandidateProposal[] = []): GameAiPort {
  return {
    generateQuestions: vi.fn(async () => ({
      value: questions,
      mode: "fallback" as const,
    })),
    analyzeMatches: vi.fn(async () => ({
      value: candidates,
      mode: "fallback" as const,
    })),
    writeSummary: vi.fn(async ({ approved }) => ({
      value:
        approved.length === 0
          ? "No shared spark is a perfectly good result."
          : `You found ${approved.length} shared spark.`,
      mode: "fallback" as const,
    })),
  };
}

async function createJoinedRoom(repository: MemoryGameRepository) {
  const host = await repository.createRoom({
    name: "Avery",
    adultConfirmed: true,
    aiConsent: true,
  });
  const guest = await repository.joinRoom({
    code: host.view.code,
    name: "Jordan",
    adultConfirmed: true,
    aiConsent: true,
  });
  return { host, guest, roomId: host.view.roomId };
}

async function startQuestions(
  repository: MemoryGameRepository,
  room: Awaited<ReturnType<typeof createJoinedRoom>>,
) {
  await repository.submitPreferences(room.roomId, room.host.playerToken, {
    operationId: randomUUID(),
    categories: ["connection"],
    intensity: "medium",
  });
  await repository.submitPreferences(room.roomId, room.guest.playerToken, {
    operationId: randomUUID(),
    categories: ["connection", "playfulness"],
    intensity: "hot",
  });
}

async function answerAllQuestions(
  repository: MemoryGameRepository,
  room: Awaited<ReturnType<typeof createJoinedRoom>>,
) {
  for (let index = 0; index < GAME_QUESTION_COUNT; index += 1) {
    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      answer: `host answer ${index}`,
    });
    await repository.submitAnswer(room.roomId, room.guest.playerToken, {
      operationId: randomUUID(),
      answer: `guest answer ${index}`,
    });
  }
}

function expectPhase<T extends RoomView["phase"]>(
  view: RoomView,
  phase: T,
): asserts view is Extract<RoomView, { phase: T }> {
  expect(view.phase).toBe(phase);
}

describe("MemoryGameRepository", () => {
  it("creates a private two-seat room and rejects a third player", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);

    expect(room.host.playerToken).not.toBe(room.guest.playerToken);
    expect(room.host.view.code).toMatch(/^[A-Z0-9]{6}$/);
    expectPhase(room.guest.view, "preferences");

    await expect(
      repository.joinRoom({
        code: room.host.view.code,
        name: "Third",
        adultConfirmed: true,
        aiConsent: true,
      }),
    ).rejects.toMatchObject({ code: "ROOM_FULL" } satisfies Partial<GameError>);
  });

  it("synchronizes the same question while never projecting a partner answer", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    const hostView = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    const guestView = (await repository.getRoom(room.roomId, room.guest.playerToken)).view;
    expectPhase(hostView, "questions");
    expectPhase(guestView, "questions");
    expect(hostView.question.text).toBe(guestView.question.text);

    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      answer: "SECRET PARTNER ANSWER",
    });
    const partnerProjection = await repository.getRoom(
      room.roomId,
      room.guest.playerToken,
    );
    expect(JSON.stringify(partnerProjection)).not.toContain("SECRET PARTNER ANSWER");
    expectPhase(partnerProjection.view, "questions");
    expect(partnerProjection.view.question.partnerSubmitted).toBe(true);
  });

  it("makes an exact operationId retry harmless and rejects reuse with new input", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);
    const operationId = randomUUID();
    const input = { operationId, answer: "Only once" };

    const first = await repository.submitAnswer(
      room.roomId,
      room.host.playerToken,
      input,
    );
    const retry = await repository.submitAnswer(
      room.roomId,
      room.host.playerToken,
      input,
    );
    expect(retry.view.version).toBe(first.view.version);

    await expect(
      repository.submitAnswer(room.roomId, room.host.playerToken, {
        operationId,
        answer: "Changed payload",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<GameError>);
  });

  it("advances only after both players answer all eight rounds", async () => {
    const candidate: MatchCandidateProposal = {
      theme: "Slow anticipation",
      discussionPrompt: "What would make anticipation fun for both of you?",
      compatibility: "shared",
    };
    const ai = createAi([candidate]);
    const repository = new MemoryGameRepository(() => ai);
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    for (let index = 0; index < GAME_QUESTION_COUNT; index += 1) {
      const host = await repository.submitAnswer(
        room.roomId,
        room.host.playerToken,
        { operationId: randomUUID(), answer: `host ${index}` },
      );
      expectPhase(host.view, "questions");
      expect(host.view.question.ordinal).toBe(index + 1);

      const guest = await repository.submitAnswer(
        room.roomId,
        room.guest.playerToken,
        { operationId: randomUUID(), answer: `guest ${index}` },
      );
      if (index < GAME_QUESTION_COUNT - 1) {
        expectPhase(guest.view, "questions");
        expect(guest.view.question.ordinal).toBe(index + 2);
      } else {
        expectPhase(guest.view, "review");
      }
    }
    expect(ai.analyzeMatches).toHaveBeenCalledOnce();
  });

  it("opens discussion only for candidates approved by both players", async () => {
    const candidates: MatchCandidateProposal[] = [
      {
        theme: "Shared spark",
        discussionPrompt: "Discuss the shared spark.",
        compatibility: "shared",
      },
      {
        theme: "One-sided spark",
        discussionPrompt: "Discuss only if both want to.",
        compatibility: "complementary",
      },
    ];
    const repository = new MemoryGameRepository(() => createAi(candidates));
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);
    await answerAllQuestions(repository, room);
    const review = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    expectPhase(review, "review");
    const [shared, oneSided] = review.review.candidates;

    await repository.submitBallot(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      decisions: [
        { candidateId: shared.candidateId, approve: true },
        { candidateId: oneSided.candidateId, approve: true },
      ],
    });
    const result = await repository.submitBallot(
      room.roomId,
      room.guest.playerToken,
      {
        operationId: randomUUID(),
        decisions: [
          { candidateId: shared.candidateId, approve: true },
          { candidateId: oneSided.candidateId, approve: false },
        ],
      },
    );
    expectPhase(result.view, "discussion");
    expect(result.view.discussion.total).toBe(1);
    expect(result.view.discussion.candidate.candidateId).toBe(shared.candidateId);
  });

  it("gates each discussion on both players and completes with approved themes only", async () => {
    const candidates: MatchCandidateProposal[] = [
      {
        theme: "First mutual spark",
        discussionPrompt: "Talk about the first spark.",
        compatibility: "shared",
      },
      {
        theme: "Second mutual spark",
        discussionPrompt: "Talk about the second spark.",
        compatibility: "complementary",
      },
    ];
    const ai = createAi(candidates);
    const repository = new MemoryGameRepository(() => ai);
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);
    await answerAllQuestions(repository, room);
    const review = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    expectPhase(review, "review");
    const decisions = review.review.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      approve: true,
    }));

    await repository.submitBallot(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      decisions,
    });
    await repository.submitBallot(room.roomId, room.guest.playerToken, {
      operationId: randomUUID(),
      decisions,
    });

    const firstWaiting = await repository.markReady(
      room.roomId,
      room.host.playerToken,
      { operationId: randomUUID() },
    );
    expectPhase(firstWaiting.view, "discussion");
    expect(firstWaiting.view.discussion.ordinal).toBe(1);
    expect(firstWaiting.view.discussion.selfReady).toBe(true);
    expect(firstWaiting.view.discussion.partnerReady).toBe(false);

    const secondDiscussion = await repository.markReady(
      room.roomId,
      room.guest.playerToken,
      { operationId: randomUUID() },
    );
    expectPhase(secondDiscussion.view, "discussion");
    expect(secondDiscussion.view.discussion.ordinal).toBe(2);

    await repository.markReady(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
    });
    const completed = await repository.markReady(
      room.roomId,
      room.guest.playerToken,
      { operationId: randomUUID() },
    );
    expectPhase(completed.view, "complete");
    expect(completed.view.complete.approvedCount).toBe(2);

    const summaryInput = vi.mocked(ai.writeSummary).mock.calls[0][0];
    expect(summaryInput.approved).toEqual(review.review.candidates);
    expect(JSON.stringify(summaryInput)).not.toContain("host answer");
    expect(JSON.stringify(summaryInput)).not.toContain("guest answer");
  });

  it("completes cleanly when analysis finds zero matches", async () => {
    const ai = createAi([]);
    const repository = new MemoryGameRepository(() => ai);
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);
    await answerAllQuestions(repository, room);

    const complete = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    expectPhase(complete, "complete");
    expect(complete.complete.approvedCount).toBe(0);
    expect(complete.complete.summary).toContain("perfectly good result");
    expect(ai.writeSummary).toHaveBeenCalledWith({
      playerNames: ["Avery", "Jordan"],
      approved: [],
    });
  });
});
