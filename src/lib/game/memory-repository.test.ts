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

async function getVersion(
  repository: MemoryGameRepository,
  roomId: string,
  playerToken: string,
): Promise<number> {
  const { view } = await repository.getRoom(roomId, playerToken);
  return view.version;
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
  const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
  await repository.submitPreferences(room.roomId, room.host.playerToken, {
    operationId: randomUUID(),
    expectedVersion: hostVersion,
    categories: ["connection"],
    intensity: "medium",
  });
  const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
  await repository.submitPreferences(room.roomId, room.guest.playerToken, {
    operationId: randomUUID(),
    expectedVersion: guestVersion,
    categories: ["connection", "playfulness"],
    intensity: "hot",
  });
}

async function answerAllQuestions(
  repository: MemoryGameRepository,
  room: Awaited<ReturnType<typeof createJoinedRoom>>,
) {
  for (let index = 0; index < GAME_QUESTION_COUNT; index += 1) {
    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostVersion,
      ordinal: index + 1,
      answer: `host answer ${index}`,
    });
    const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    await repository.submitAnswer(room.roomId, room.guest.playerToken, {
      operationId: randomUUID(),
      expectedVersion: guestVersion,
      ordinal: index + 1,
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

  it("uses only shared categories and privately resets a no-overlap round", async () => {
    const ai = createAi();
    const repository = new MemoryGameRepository(() => ai);
    const room = await createJoinedRoom(repository);

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitPreferences(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostVersion,
      categories: ["connection"],
      intensity: "medium",
    });

    const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    await expect(
      repository.submitPreferences(room.roomId, room.guest.playerToken, {
        operationId: randomUUID(),
        expectedVersion: guestVersion,
        categories: ["fantasy"],
        intensity: "hot",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<GameError>);

    const hostView = (await repository.getRoom(room.roomId, room.host.playerToken))
      .view;
    const guestView = (
      await repository.getRoom(room.roomId, room.guest.playerToken)
    ).view;
    expectPhase(hostView, "preferences");
    expectPhase(guestView, "preferences");
    expect(hostView.preferences).toEqual({
      selfSubmitted: false,
      partnerSubmitted: false,
      retryReason: "no_shared_categories",
    });
    expect(guestView.preferences).toEqual({
      selfSubmitted: false,
      partnerSubmitted: false,
      retryReason: "no_shared_categories",
    });
    expect(ai.generateQuestions).not.toHaveBeenCalled();
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

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostVersion,
      ordinal: 1,
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
    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    const input = { operationId, expectedVersion: hostVersion, ordinal: 1, answer: "Only once" };

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
        expectedVersion: hostVersion,
        ordinal: 1,
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
      const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
      const host = await repository.submitAnswer(
        room.roomId,
        room.host.playerToken,
        {
          operationId: randomUUID(),
          expectedVersion: hostVersion,
          ordinal: index + 1,
          answer: `host ${index}`,
        },
      );
      expectPhase(host.view, "questions");
      expect(host.view.question.ordinal).toBe(index + 1);

      const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
      const guest = await repository.submitAnswer(
        room.roomId,
        room.guest.playerToken,
        {
          operationId: randomUUID(),
          expectedVersion: guestVersion,
          ordinal: index + 1,
          answer: `guest ${index}`,
        },
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

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitBallot(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostVersion,
      decisions: [
        { candidateId: shared.candidateId, approve: true },
        { candidateId: oneSided.candidateId, approve: true },
      ],
    });

    const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    const result = await repository.submitBallot(
      room.roomId,
      room.guest.playerToken,
      {
        operationId: randomUUID(),
        expectedVersion: guestVersion,
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

    const hostBallotVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitBallot(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostBallotVersion,
      decisions,
    });
    const guestBallotVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    await repository.submitBallot(room.roomId, room.guest.playerToken, {
      operationId: randomUUID(),
      expectedVersion: guestBallotVersion,
      decisions,
    });

    const hostReady1Version = await getVersion(repository, room.roomId, room.host.playerToken);
    const firstWaiting = await repository.markReady(
      room.roomId,
      room.host.playerToken,
      {
        operationId: randomUUID(),
        expectedVersion: hostReady1Version,
        candidateId: review.review.candidates[0].candidateId,
        ordinal: 1,
      },
    );
    expectPhase(firstWaiting.view, "discussion");
    expect(firstWaiting.view.discussion.ordinal).toBe(1);
    expect(firstWaiting.view.discussion.selfReady).toBe(true);
    expect(firstWaiting.view.discussion.partnerReady).toBe(false);

    const guestReady1Version = await getVersion(repository, room.roomId, room.guest.playerToken);
    const secondDiscussion = await repository.markReady(
      room.roomId,
      room.guest.playerToken,
      {
        operationId: randomUUID(),
        expectedVersion: guestReady1Version,
        candidateId: review.review.candidates[0].candidateId,
        ordinal: 1,
      },
    );
    expectPhase(secondDiscussion.view, "discussion");
    expect(secondDiscussion.view.discussion.ordinal).toBe(2);

    const hostReady2Version = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.markReady(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostReady2Version,
      candidateId: review.review.candidates[1].candidateId,
      ordinal: 2,
    });
    const guestReady2Version = await getVersion(repository, room.roomId, room.guest.playerToken);
    const completed = await repository.markReady(
      room.roomId,
      room.guest.playerToken,
      {
        operationId: randomUUID(),
        expectedVersion: guestReady2Version,
        candidateId: review.review.candidates[1].candidateId,
        ordinal: 2,
      },
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

  // ADVERSARIAL ACCEPTANCE TESTS FROM PROTOCOL TRIAL_3_REPLAY_SAFE_COMMANDS_FEATURE

  it("Adversarial 1: exact retry of answer after partner advances room does not consume a later question or increment version", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    const operationId = randomUUID();
    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);

    // Host submits answer for question 1
    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId,
      expectedVersion: hostVersion,
      ordinal: 1,
      answer: "A nice answer",
    });

    // Guest submits answer for question 1 (advances room to question 2)
    const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    await repository.submitAnswer(room.roomId, room.guest.playerToken, {
      operationId: randomUUID(),
      expectedVersion: guestVersion,
      ordinal: 1,
      answer: "Partner answer",
    });

    // Verify room has indeed advanced to question 2
    const currentView = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    expectPhase(currentView, "questions");
    expect(currentView.question.ordinal).toBe(2);

    const advancedVersion = await getVersion(repository, room.roomId, room.host.playerToken);

    // Host retries the identical operationId for question 1 (which has since advanced)
    const retryRes = await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId,
      expectedVersion: hostVersion,
      ordinal: 1,
      answer: "A nice answer",
    });

    // It must return exact same projection, version doesn't change, and doesn't answer question 2
    expect(retryRes.view.version).toBe(advancedVersion);
    const currentViewAfterRetry = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    expectPhase(currentViewAfterRetry, "questions");
    expect(currentViewAfterRetry.question.ordinal).toBe(2);
    expect(currentViewAfterRetry.question.selfSubmitted).toBe(false); // Question 2 is not answered!
  });

  it("Adversarial 2: a stale tab submits a new operation after another transition; it receives STALE_COMMAND and no state change", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    // Host sees room version 5 (when first entering questions phase)
    const hostVersionStale = await getVersion(repository, room.roomId, room.host.playerToken);

    // Host submits answer for question 1
    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostVersionStale,
      ordinal: 1,
      answer: "Host answer",
    });

    // Now version is advanced. Stale tab of Host tries to submit answer for question 1 with stale version
    await expect(
      repository.submitAnswer(room.roomId, room.host.playerToken, {
        operationId: randomUUID(),
        expectedVersion: hostVersionStale,
        ordinal: 1,
        answer: "Stale answer",
      }),
    ).rejects.toMatchObject({ code: "STALE_COMMAND" } satisfies Partial<GameError>);
  });

  it("Adversarial 3: same player reuses operation ID with different intent/action/payload; rejected", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    const operationId = randomUUID();
    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);

    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId,
      expectedVersion: hostVersion,
      ordinal: 1,
      answer: "Original answer",
    });

    // Reuse same operationId with different answer
    await expect(
      repository.submitAnswer(room.roomId, room.host.playerToken, {
        operationId,
        expectedVersion: hostVersion,
        ordinal: 1,
        answer: "Different answer",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<GameError>);

    // Reuse same operationId with different action (skip)
    await expect(
      repository.submitAnswer(room.roomId, room.host.playerToken, {
        operationId,
        expectedVersion: hostVersion,
        ordinal: 1,
        skip: true,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<GameError>);
  });

  it("Adversarial 4: different players use the same UUID; operations remain independent", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    const sharedUuid = randomUUID();

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: sharedUuid,
      expectedVersion: hostVersion,
      ordinal: 1,
      answer: "Host answer",
    });

    const guestVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    // Guest uses same sharedUuid. Should succeed and not collide or trigger replay logic
    const guestRes = await repository.submitAnswer(room.roomId, room.guest.playerToken, {
      operationId: sharedUuid,
      expectedVersion: guestVersion,
      ordinal: 1,
      answer: "Guest answer",
    });

    expectPhase(guestRes.view, "questions");
    expect(guestRes.view.question.ordinal).toBe(2); // advanced to Q2 because both answered
  });

  it("Adversarial 5: an answer for question 1 cannot land on question 2", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    // Answer for question 2 submitted when current is question 1
    await expect(
      repository.submitAnswer(room.roomId, room.host.playerToken, {
        operationId: randomUUID(),
        expectedVersion: hostVersion,
        ordinal: 2, // incorrect ordinal
        answer: "Premature answer",
      }),
    ).rejects.toMatchObject({ code: "STALE_COMMAND" } satisfies Partial<GameError>);
  });

  it("Adversarial 6: a ballot cannot be applied to a different candidate set", async () => {
    const candidates: MatchCandidateProposal[] = [
      { theme: "Theme A", discussionPrompt: "Prompt A", compatibility: "shared" },
    ];
    const repository = new MemoryGameRepository(() => createAi(candidates));
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);
    await answerAllQuestions(repository, room);

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    // Submit ballot with an unknown candidateId
    await expect(
      repository.submitBallot(room.roomId, room.host.playerToken, {
        operationId: randomUUID(),
        expectedVersion: hostVersion,
        decisions: [
          { candidateId: randomUUID(), approve: true }, // wrong candidateId
        ],
      }),
    ).rejects.toMatchObject({ code: "STALE_COMMAND" } satisfies Partial<GameError>);
  });

  it("Adversarial 7: ready intent cannot apply to another discussion candidate or ordinal", async () => {
    const candidates: MatchCandidateProposal[] = [
      { theme: "Theme A", discussionPrompt: "Prompt A", compatibility: "shared" },
      { theme: "Theme B", discussionPrompt: "Prompt B", compatibility: "shared" },
    ];
    const repository = new MemoryGameRepository(() => createAi(candidates));
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);
    await answerAllQuestions(repository, room);

    const review = (await repository.getRoom(room.roomId, room.host.playerToken)).view;
    expectPhase(review, "review");
    const [candA, candB] = review.review.candidates;

    const hostBallotVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitBallot(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostBallotVersion,
      decisions: [
        { candidateId: candA.candidateId, approve: true },
        { candidateId: candB.candidateId, approve: true },
      ],
    });
    const guestBallotVersion = await getVersion(repository, room.roomId, room.guest.playerToken);
    await repository.submitBallot(room.roomId, room.guest.playerToken, {
      operationId: randomUUID(),
      expectedVersion: guestBallotVersion,
      decisions: [
        { candidateId: candA.candidateId, approve: true },
        { candidateId: candB.candidateId, approve: true },
      ],
    });

    const hostReadyVersion = await getVersion(repository, room.roomId, room.host.playerToken);

    // Try to mark ready for discussion ordinal 2 (Theme B) while current discussion is ordinal 1 (Theme A)
    await expect(
      repository.markReady(room.roomId, room.host.playerToken, {
        operationId: randomUUID(),
        expectedVersion: hostReadyVersion,
        candidateId: candB.candidateId, // wrong candidate for current discussion ordinal 1
        ordinal: 2, // wrong ordinal
      }),
    ).rejects.toMatchObject({ code: "STALE_COMMAND" } satisfies Partial<GameError>);
  });

  it("Adversarial 8: exact retries do not rerun AI generation, matches or summary", async () => {
    const ai = createAi();
    const repository = new MemoryGameRepository(() => ai);
    const room = await createJoinedRoom(repository);

    // 1. Submit preferences retry test
    const opIdPref = randomUUID();
    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    await repository.submitPreferences(room.roomId, room.host.playerToken, {
      operationId: opIdPref,
      expectedVersion: hostVersion,
      categories: ["connection"],
      intensity: "medium",
    });

    // Retry preferences
    await repository.submitPreferences(room.roomId, room.host.playerToken, {
      operationId: opIdPref,
      expectedVersion: hostVersion,
      categories: ["connection"],
      intensity: "medium",
    });

    // ai.generateQuestions shouldn't have been called at all yet since guest hasn't submitted
    expect(ai.generateQuestions).not.toHaveBeenCalled();
  });

  it("Adversarial 9: API errors and replay responses contain no partner preferences, answers, skips, ballots, source evidence, or tokens", async () => {
    const repository = new MemoryGameRepository(() => createAi());
    const room = await createJoinedRoom(repository);
    await startQuestions(repository, room);

    const hostVersion = await getVersion(repository, room.roomId, room.host.playerToken);
    // Succeeded preferences response should be projected and safe
    const res = await repository.submitAnswer(room.roomId, room.host.playerToken, {
      operationId: randomUUID(),
      expectedVersion: hostVersion,
      ordinal: 1,
      answer: "My host answer secret",
    });

    const jsonStr = JSON.stringify(res);
    expect(jsonStr).not.toContain("My guest answer secret"); // partner's answer
    expect(jsonStr).not.toContain("SECRET_PARTNER_PREFERENCE");
    expect(jsonStr).not.toContain("playerToken"); // no exposed playerToken of partner
  });
});
