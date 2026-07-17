import type {
  AiMode,
  CategoryId,
  IntensityId,
  MatchCandidateView,
} from "@/lib/game/contracts";

export interface GameQuestionContent {
  text: string;
  category: CategoryId;
}

export interface MatchEvidence {
  ordinal: number;
  question: string;
  playerAAnswer: string | null;
  playerBAnswer: string | null;
}

export type MatchCandidateProposal = Omit<MatchCandidateView, "candidateId">;

export interface AiResult<T> {
  value: T;
  mode: AiMode;
}

export interface GameAiPort {
  generateQuestions(input: {
    categories: CategoryId[];
    intensity: IntensityId;
  }): Promise<AiResult<GameQuestionContent[]>>;

  analyzeMatches(input: {
    evidence: MatchEvidence[];
  }): Promise<AiResult<MatchCandidateProposal[]>>;

  writeSummary(input: {
    playerNames: [string, string];
    approved: MatchCandidateView[];
  }): Promise<AiResult<string>>;
}
