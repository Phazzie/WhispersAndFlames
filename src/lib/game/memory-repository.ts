import { randomBytes, randomUUID } from "node:crypto";

import {
  GAME_QUESTION_COUNT,
  categoryIds,
  type AiMode,
  type AnswerInput,
  type BallotInput,
  type BusyState,
  type CategoryId,
  type CreateRoomInput,
  type IntensityId,
  type JoinRoomInput,
  type MatchCandidateView,
  type PreferencesInput,
  type ReadyInput,
  type RoomView,
  type SessionResponse,
  type ViewResponse,
} from "@/lib/game/contracts";
import { GameError, internalGameError } from "@/lib/game/errors";
import type { GameAiPort, GameQuestionContent } from "@/lib/game/ports";
import type { GameRepository } from "@/lib/game/repository";

type Seat = "host" | "guest";
type Phase = RoomView["phase"];
type AiResolver = () => GameAiPort | Promise<GameAiPort>;

interface PlayerPreferences {
  categories: CategoryId[];
  intensity: IntensityId;
}

interface PrivateAnswer {
  answer: string | null;
  skip: boolean;
}

interface InternalPlayer {
  seat: Seat;
  name: string;
  token: string;
  preferences?: PlayerPreferences;
  answers: Map<number, PrivateAnswer>;
  ballot?: Map<string, boolean>;
}

interface CompletedOperation {
  kind: "preferences" | "answer" | "ballot" | "ready";
  signature: string;
}

interface InternalRoom {
  id: string;
  code: string;
  version: number;
  phase: Phase;
  busy: BusyState;
  aiMode: AiMode;
  host: InternalPlayer;
  guest?: InternalPlayer;
  preferenceRetry: "no_shared_categories" | null;
  questions: GameQuestionContent[];
  currentQuestion: number;
  candidates: MatchCandidateView[];
  approved: MatchCandidateView[];
  discussionIndex: number;
  readyByCandidate: Map<string, Set<Seat>>;
  summary?: string;
  operations: Map<string, CompletedOperation>;
  lock: Promise<void>;
}

const intensityRank: Record<IntensityId, number> = {
  mild: 0,
  medium: 1,
  hot: 2,
};

export class MemoryGameRepository implements GameRepository {
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly roomIdsByCode = new Map<string, string>();

  constructor(private readonly resolveAi: AiResolver) {}

  async createRoom(input: CreateRoomInput): Promise<SessionResponse> {
    const host = this.createPlayer("host", input.name);
    const room: InternalRoom = {
      id: randomUUID(),
      code: this.createUniqueCode(),
      version: 1,
      phase: "lobby",
      busy: null,
      aiMode: "fallback",
      host,
      preferenceRetry: null,
      questions: [],
      currentQuestion: 0,
      candidates: [],
      approved: [],
      discussionIndex: 0,
      readyByCandidate: new Map(),
      operations: new Map(),
      lock: Promise.resolve(),
    };

    this.rooms.set(room.id, room);
    this.roomIdsByCode.set(room.code, room.id);

    return {
      playerToken: host.token,
      view: this.project(room, host),
    };
  }

  async joinRoom(input: JoinRoomInput): Promise<SessionResponse> {
    const roomId = this.roomIdsByCode.get(input.code);
    if (!roomId) {
      throw new GameError("ROOM_NOT_FOUND");
    }

    const room = this.requireRoom(roomId);
    return this.exclusive(room, async () => {
      if (room.guest) {
        throw new GameError("ROOM_FULL");
      }

      const guest = this.createPlayer("guest", input.name);
      room.guest = guest;
      room.phase = "preferences";
      room.version += 1;

      return {
        playerToken: guest.token,
        view: this.project(room, guest),
      };
    });
  }

  async getRoom(roomId: string, playerToken: string): Promise<ViewResponse> {
    const room = this.requireRoom(roomId);
    const player = this.authenticate(room, playerToken);
    return { view: this.project(room, player) };
  }

  async submitPreferences(
    roomId: string,
    playerToken: string,
    input: PreferencesInput,
  ): Promise<ViewResponse> {
    const room = this.requireRoom(roomId);
    return this.exclusive(room, async () => {
      const player = this.authenticate(room, playerToken);
      const signature = JSON.stringify({
        categories: [...input.categories].sort(),
        intensity: input.intensity,
      });
      if (this.isReplay(room, player, input.operationId, "preferences", signature)) {
        return { view: this.project(room, player) };
      }

      if (room.version !== input.expectedVersion || room.phase !== "preferences" || room.busy !== null) {
        throw new GameError("STALE_COMMAND");
      }

      if (player.preferences) {
        throw new GameError("ALREADY_SUBMITTED");
      }

      player.preferences = {
        categories: [...input.categories],
        intensity: input.intensity,
      };
      room.version += 1;

      const partner = this.partnerFor(room, player);
      if (!partner.preferences) {
        this.completeOperation(
          room,
          player,
          input.operationId,
          "preferences",
          signature,
        );
        return { view: this.project(room, player) };
      }

      const combinedPreferences = this.combinePreferences(
        player.preferences,
        partner.preferences,
      );
      if (combinedPreferences.categories.length === 0) {
        room.host.preferences = undefined;
        if (room.guest) {
          room.guest.preferences = undefined;
        }
        room.preferenceRetry = "no_shared_categories";
        room.version += 1;
        this.completeOperation(
          room,
          player,
          input.operationId,
          "preferences",
          signature,
        );
        throw new GameError(
          "BAD_REQUEST",
          "Your private choices did not overlap yet. Both were cleared so you can choose again.",
        );
      }

      room.busy = "weaving_questions";
      room.version += 1;
      try {
        const ai = await this.resolveAi();
        const result = await ai.generateQuestions(combinedPreferences);
        room.questions = this.validateQuestions(result.value);
        room.currentQuestion = 0;
        room.aiMode = result.mode;
        room.phase = "questions";
        room.busy = null;
        room.version += 1;
        this.completeOperation(
          room,
          player,
          input.operationId,
          "preferences",
          signature,
        );
        return { view: this.project(room, player) };
      } catch {
        player.preferences = undefined;
        room.busy = null;
        room.version += 1;
        throw internalGameError();
      }
    });
  }

  async submitAnswer(
    roomId: string,
    playerToken: string,
    input: AnswerInput,
  ): Promise<ViewResponse> {
    const room = this.requireRoom(roomId);
    return this.exclusive(room, async () => {
      const player = this.authenticate(room, playerToken);
      const signature = JSON.stringify({
        answer: input.answer ?? null,
        skip: input.skip === true,
        ordinal: input.ordinal,
      });
      if (this.isReplay(room, player, input.operationId, "answer", signature)) {
        return { view: this.project(room, player) };
      }

      const expectedOrdinal = room.currentQuestion + 1;
      if (
        room.version !== input.expectedVersion ||
        room.phase !== "questions" ||
        room.busy !== null ||
        input.ordinal !== expectedOrdinal
      ) {
        throw new GameError("STALE_COMMAND");
      }

      const ordinal = room.currentQuestion;
      if (player.answers.has(ordinal)) {
        throw new GameError("ALREADY_SUBMITTED");
      }

      player.answers.set(ordinal, {
        answer: input.answer ?? null,
        skip: input.skip === true,
      });
      room.version += 1;

      const partner = this.partnerFor(room, player);
      if (!partner.answers.has(ordinal)) {
        this.completeOperation(
          room,
          player,
          input.operationId,
          "answer",
          signature,
        );
        return { view: this.project(room, player) };
      }

      if (ordinal < GAME_QUESTION_COUNT - 1) {
        room.currentQuestion += 1;
        room.version += 1;
        this.completeOperation(
          room,
          player,
          input.operationId,
          "answer",
          signature,
        );
        return { view: this.project(room, player) };
      }

      room.busy = "finding_sparks";
      room.version += 1;
      try {
        const ai = await this.resolveAi();
        const matchResult = await ai.analyzeMatches({
          evidence: this.buildMatchEvidence(room),
        });
        room.candidates = this.validateCandidates(matchResult.value);
        room.aiMode = matchResult.mode;

        if (room.candidates.length > 0) {
          room.phase = "review";
          room.busy = null;
          room.version += 1;
        } else {
          await this.finish(room, ai, []);
        }

        this.completeOperation(
          room,
          player,
          input.operationId,
          "answer",
          signature,
        );
        return { view: this.project(room, player) };
      } catch {
        player.answers.delete(ordinal);
        room.candidates = [];
        room.approved = [];
        room.busy = null;
        room.version += 1;
        throw internalGameError();
      }
    });
  }

  async submitBallot(
    roomId: string,
    playerToken: string,
    input: BallotInput,
  ): Promise<ViewResponse> {
    const room = this.requireRoom(roomId);
    return this.exclusive(room, async () => {
      const player = this.authenticate(room, playerToken);
      const signature = JSON.stringify({
        decisions: [...input.decisions].sort((a, b) =>
          a.candidateId.localeCompare(b.candidateId),
        ),
      });
      if (this.isReplay(room, player, input.operationId, "ballot", signature)) {
        return { view: this.project(room, player) };
      }

      const currentCandidateIds = room.candidates.map((c) => c.candidateId).sort();
      const inputCandidateIds = input.decisions.map((d) => d.candidateId).sort();
      const candidatesMatch =
        currentCandidateIds.length === inputCandidateIds.length &&
        currentCandidateIds.every((id, idx) => id === inputCandidateIds[idx]);

      if (
        room.version !== input.expectedVersion ||
        room.phase !== "review" ||
        room.busy !== null ||
        !candidatesMatch
      ) {
        throw new GameError("STALE_COMMAND");
      }

      if (player.ballot) {
        throw new GameError("ALREADY_SUBMITTED");
      }

      player.ballot = new Map(
        input.decisions.map((decision) => [decision.candidateId, decision.approve]),
      );
      room.version += 1;
      const partner = this.partnerFor(room, player);
      if (!partner.ballot) {
        this.completeOperation(
          room,
          player,
          input.operationId,
          "ballot",
          signature,
        );
        return { view: this.project(room, player) };
      }

      room.approved = room.candidates.filter(
        (candidate) =>
          player.ballot?.get(candidate.candidateId) === true &&
          partner.ballot?.get(candidate.candidateId) === true,
      );

      try {
        if (room.approved.length === 0) {
          const ai = await this.resolveAi();
          await this.finish(room, ai, []);
        } else {
          room.phase = "discussion";
          room.discussionIndex = 0;
          room.version += 1;
        }

        this.completeOperation(
          room,
          player,
          input.operationId,
          "ballot",
          signature,
        );
        return { view: this.project(room, player) };
      } catch {
        player.ballot = undefined;
        room.approved = [];
        room.busy = null;
        room.version += 1;
        throw internalGameError();
      }
    });
  }

  async markReady(
    roomId: string,
    playerToken: string,
    input: ReadyInput,
  ): Promise<ViewResponse> {
    const room = this.requireRoom(roomId);
    return this.exclusive(room, async () => {
      const player = this.authenticate(room, playerToken);
      const signature = JSON.stringify({
        candidateId: input.candidateId,
        ordinal: input.ordinal,
      });
      if (this.isReplay(room, player, input.operationId, "ready", signature)) {
        return { view: this.project(room, player) };
      }

      const currentCandidate = room.approved[room.discussionIndex];
      const currentOrdinal = room.discussionIndex + 1;
      if (
        room.version !== input.expectedVersion ||
        room.phase !== "discussion" ||
        room.busy !== null ||
        !currentCandidate ||
        input.candidateId !== currentCandidate.candidateId ||
        input.ordinal !== currentOrdinal
      ) {
        throw new GameError("STALE_COMMAND");
      }

      const ready = room.readyByCandidate.get(currentCandidate.candidateId) ?? new Set();
      if (ready.has(player.seat)) {
        throw new GameError("ALREADY_SUBMITTED");
      }
      ready.add(player.seat);
      room.readyByCandidate.set(currentCandidate.candidateId, ready);
      room.version += 1;

      const partner = this.partnerFor(room, player);
      if (!ready.has(partner.seat)) {
        this.completeOperation(
          room,
          player,
          input.operationId,
          "ready",
          signature,
        );
        return { view: this.project(room, player) };
      }

      if (room.discussionIndex < room.approved.length - 1) {
        room.discussionIndex += 1;
        room.version += 1;
        this.completeOperation(
          room,
          player,
          input.operationId,
          "ready",
          signature,
        );
        return { view: this.project(room, player) };
      }

      try {
        const ai = await this.resolveAi();
        await this.finish(room, ai, room.approved);
        this.completeOperation(
          room,
          player,
          input.operationId,
          "ready",
          signature,
        );
        return { view: this.project(room, player) };
      } catch {
        ready.delete(player.seat);
        room.busy = null;
        room.version += 1;
        throw internalGameError();
      }
    });
  }

  private createPlayer(seat: Seat, name: string): InternalPlayer {
    return {
      seat,
      name,
      token: randomBytes(32).toString("base64url"),
      answers: new Map(),
    };
  }

  private createUniqueCode(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = randomBytes(8)
        .toString("base64url")
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase()
        .slice(0, 6);
      if (code.length === 6 && !this.roomIdsByCode.has(code)) {
        return code;
      }
    }
    throw internalGameError();
  }

  private requireRoom(roomId: string): InternalRoom {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new GameError("ROOM_NOT_FOUND");
    }
    return room;
  }

  private authenticate(room: InternalRoom, token: string): InternalPlayer {
    if (room.host.token === token) {
      return room.host;
    }
    if (room.guest?.token === token) {
      return room.guest;
    }
    throw new GameError("UNAUTHORIZED");
  }

  private partnerFor(room: InternalRoom, player: InternalPlayer): InternalPlayer {
    const partner = player.seat === "host" ? room.guest : room.host;
    if (!partner) {
      throw new GameError("INVALID_PHASE");
    }
    return partner;
  }

  private assertAvailable(room: InternalRoom, phase: Phase): void {
    if (room.phase !== phase || room.busy !== null) {
      throw new GameError("INVALID_PHASE");
    }
  }

  private async exclusive<T>(
    room: InternalRoom,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = room.lock;
    let release: () => void = () => undefined;
    room.lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private operationKey(player: InternalPlayer, operationId: string): string {
    return `${player.seat}:${operationId}`;
  }

  private isReplay(
    room: InternalRoom,
    player: InternalPlayer,
    operationId: string,
    kind: CompletedOperation["kind"],
    signature: string,
  ): boolean {
    const completed = room.operations.get(this.operationKey(player, operationId));
    if (!completed) {
      return false;
    }
    if (completed.kind !== kind || completed.signature !== signature) {
      throw new GameError("BAD_REQUEST");
    }
    return true;
  }

  private completeOperation(
    room: InternalRoom,
    player: InternalPlayer,
    operationId: string,
    kind: CompletedOperation["kind"],
    signature: string,
  ): void {
    room.operations.set(this.operationKey(player, operationId), { kind, signature });
  }

  private combinePreferences(
    first: PlayerPreferences,
    second: PlayerPreferences,
  ): { categories: CategoryId[]; intensity: IntensityId } {
    const categories = categoryIds.filter(
      (category) =>
        first.categories.includes(category) && second.categories.includes(category),
    );
    const intensity =
      intensityRank[first.intensity] <= intensityRank[second.intensity]
        ? first.intensity
        : second.intensity;
    return { categories, intensity };
  }

  private validateQuestions(
    questions: GameQuestionContent[],
  ): GameQuestionContent[] {
    if (
      questions.length !== GAME_QUESTION_COUNT ||
      questions.some(
        (question) =>
          typeof question.text !== "string" ||
          question.text.trim().length === 0 ||
          !categoryIds.includes(question.category),
      ) ||
      new Set(questions.map((question) => question.text.trim())).size !==
        GAME_QUESTION_COUNT
    ) {
      throw internalGameError();
    }
    return questions.map((question) => ({
      text: question.text.trim(),
      category: question.category,
    }));
  }

  private validateCandidates(
    candidates: Array<
      Omit<MatchCandidateView, "candidateId">
    >,
  ): MatchCandidateView[] {
    const limited = candidates.slice(0, 4);
    if (
      limited.some(
        (candidate) =>
          typeof candidate.theme !== "string" ||
          candidate.theme.trim().length === 0 ||
          typeof candidate.discussionPrompt !== "string" ||
          candidate.discussionPrompt.trim().length === 0 ||
          !["shared", "complementary"].includes(candidate.compatibility),
      )
    ) {
      throw internalGameError();
    }
    return limited.map((candidate) => ({
      candidateId: randomUUID(),
      theme: candidate.theme.trim(),
      discussionPrompt: candidate.discussionPrompt.trim(),
      compatibility: candidate.compatibility,
    }));
  }

  private buildMatchEvidence(room: InternalRoom) {
    const guest = room.guest;
    if (!guest) {
      throw internalGameError();
    }
    return room.questions.map((question, index) => ({
      ordinal: index + 1,
      question: question.text,
      playerAAnswer: room.host.answers.get(index)?.answer ?? null,
      playerBAnswer: guest.answers.get(index)?.answer ?? null,
    }));
  }

  private async finish(
    room: InternalRoom,
    ai: GameAiPort,
    approved: MatchCandidateView[],
  ): Promise<void> {
    const guest = room.guest;
    if (!guest) {
      throw internalGameError();
    }
    room.busy = "writing_summary";
    room.version += 1;
    const result = await ai.writeSummary({
      playerNames: [room.host.name, guest.name],
      approved: approved.map((candidate) => ({
        candidateId: candidate.candidateId,
        theme: candidate.theme,
        discussionPrompt: candidate.discussionPrompt,
        compatibility: candidate.compatibility,
      })),
    });
    if (typeof result.value !== "string" || result.value.trim().length === 0) {
      throw internalGameError();
    }
    room.summary = result.value.trim();
    room.aiMode = result.mode;
    room.phase = "complete";
    room.busy = null;
    room.version += 1;
  }

  private project(room: InternalRoom, player: InternalPlayer): RoomView {
    const partner = player.seat === "host" ? room.guest : room.host;
    const base = {
      roomId: room.id,
      code: room.code,
      version: room.version,
      self: { name: player.name, seat: player.seat },
      partner: {
        joined: Boolean(partner),
        name: partner?.name ?? null,
      },
      busy: room.busy,
      aiMode: room.aiMode,
    };

    if (room.phase === "lobby") {
      return { ...base, phase: "lobby" };
    }
    if (room.phase === "preferences") {
      return {
        ...base,
        phase: "preferences",
        preferences: {
          selfSubmitted: Boolean(player.preferences),
          partnerSubmitted: Boolean(partner?.preferences),
          retryReason: room.preferenceRetry,
        },
      };
    }
    if (room.phase === "questions") {
      const question = room.questions[room.currentQuestion];
      if (!question) {
        throw internalGameError();
      }
      return {
        ...base,
        phase: "questions",
        question: {
          ordinal: room.currentQuestion + 1,
          total: GAME_QUESTION_COUNT,
          text: question.text,
          category: question.category,
          selfSubmitted: player.answers.has(room.currentQuestion),
          partnerSubmitted: Boolean(partner?.answers.has(room.currentQuestion)),
        },
      };
    }
    if (room.phase === "review") {
      return {
        ...base,
        phase: "review",
        review: {
          candidates: room.candidates.map((candidate) => ({
            candidateId: candidate.candidateId,
            theme: candidate.theme,
            discussionPrompt: candidate.discussionPrompt,
            compatibility: candidate.compatibility,
          })),
          selfSubmitted: Boolean(player.ballot),
          partnerSubmitted: Boolean(partner?.ballot),
        },
      };
    }
    if (room.phase === "discussion") {
      const candidate = room.approved[room.discussionIndex];
      if (!candidate) {
        throw internalGameError();
      }
      const ready = room.readyByCandidate.get(candidate.candidateId);
      return {
        ...base,
        phase: "discussion",
        discussion: {
          candidate: {
            candidateId: candidate.candidateId,
            theme: candidate.theme,
            discussionPrompt: candidate.discussionPrompt,
            compatibility: candidate.compatibility,
          },
          ordinal: room.discussionIndex + 1,
          total: room.approved.length,
          selfReady: ready?.has(player.seat) ?? false,
          partnerReady: partner ? (ready?.has(partner.seat) ?? false) : false,
        },
      };
    }
    if (!room.summary) {
      throw internalGameError();
    }
    return {
      ...base,
      phase: "complete",
      complete: {
        summary: room.summary,
        approvedCount: room.approved.length,
      },
    };
  }
}
