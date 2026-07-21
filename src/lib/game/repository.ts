import { getGameAi } from "@/lib/ai";
import type {
  AnswerInput,
  BallotInput,
  CreateRoomInput,
  JoinRoomInput,
  PreferencesInput,
  ReadyInput,
  SessionResponse,
  ViewResponse,
} from "@/lib/game/contracts";
import { MemoryGameRepository } from "@/lib/game/memory-repository";

export interface GameRepository {
  createRoom(input: CreateRoomInput): Promise<SessionResponse>;
  joinRoom(input: JoinRoomInput): Promise<SessionResponse>;
  getRoom(roomId: string, playerToken: string): Promise<ViewResponse>;
  submitPreferences(
    roomId: string,
    playerToken: string,
    input: PreferencesInput,
  ): Promise<ViewResponse>;
  submitAnswer(
    roomId: string,
    playerToken: string,
    input: AnswerInput,
  ): Promise<ViewResponse>;
  submitBallot(
    roomId: string,
    playerToken: string,
    input: BallotInput,
  ): Promise<ViewResponse>;
  markReady(
    roomId: string,
    playerToken: string,
    input: ReadyInput,
  ): Promise<ViewResponse>;
}

const repositoryKey = Symbol.for("whispers-and-flames.game-repository");
type GameGlobal = typeof globalThis & {
  [repositoryKey]?: GameRepository;
};

export function getGameRepository(): GameRepository {
  const gameGlobal = globalThis as GameGlobal;
  gameGlobal[repositoryKey] ??= new MemoryGameRepository(() => getGameAi());
  return gameGlobal[repositoryKey];
}

export function resetGameRepositoryForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("The game repository can only be reset in tests.");
  }

  delete (globalThis as GameGlobal)[repositoryKey];
}
