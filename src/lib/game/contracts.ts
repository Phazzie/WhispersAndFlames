import { z } from "zod";

export const GAME_QUESTION_COUNT = 8;

export const categoryIds = [
  "connection",
  "attraction",
  "playfulness",
  "fantasy",
] as const;

export const intensityIds = ["mild", "medium", "hot"] as const;

export const categorySchema = z.enum(categoryIds);
export const intensitySchema = z.enum(intensityIds);

export type CategoryId = z.infer<typeof categorySchema>;
export type IntensityId = z.infer<typeof intensitySchema>;

const displayNameSchema = z.string().trim().min(1).max(30);

export const createRoomInputSchema = z
  .object({
    name: displayNameSchema,
    adultConfirmed: z.literal(true),
    aiConsent: z.literal(true),
  })
  .strict();

export const joinRoomInputSchema = createRoomInputSchema
  .extend({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/),
  })
  .strict();

export const preferencesInputSchema = z
  .object({
    operationId: z.string().uuid(),
    categories: z.array(categorySchema).min(1).max(categoryIds.length),
    intensity: intensitySchema,
  })
  .strict()
  .refine((value) => new Set(value.categories).size === value.categories.length, {
    message: "Categories must be unique",
    path: ["categories"],
  });

export const answerInputSchema = z
  .object({
    operationId: z.string().uuid(),
    answer: z.string().trim().min(1).max(1_000).optional(),
    skip: z.boolean().optional(),
  })
  .strict()
  .refine((value) => (value.skip === true) !== Boolean(value.answer), {
    message: "Submit either an answer or a skip",
  });

export const ballotInputSchema = z
  .object({
    operationId: z.string().uuid(),
    decisions: z
      .array(
        z
          .object({
            candidateId: z.string().uuid(),
            approve: z.boolean(),
          })
          .strict(),
      )
      .max(4),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.decisions.map((decision) => decision.candidateId)).size ===
      value.decisions.length,
    { message: "Candidate decisions must be unique", path: ["decisions"] },
  );

export const readyInputSchema = z
  .object({
    operationId: z.string().uuid(),
  })
  .strict();

export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>;
export type PreferencesInput = z.infer<typeof preferencesInputSchema>;
export type AnswerInput = z.infer<typeof answerInputSchema>;
export type BallotInput = z.infer<typeof ballotInputSchema>;
export type ReadyInput = z.infer<typeof readyInputSchema>;

export type AiMode = "openai" | "fallback";
export type BusyState =
  | "weaving_questions"
  | "finding_sparks"
  | "writing_summary"
  | null;

export interface PlayerIdentityView {
  name: string;
  seat: "host" | "guest";
}

export interface PartnerView {
  joined: boolean;
  name: string | null;
}

export interface QuestionView {
  ordinal: number;
  total: typeof GAME_QUESTION_COUNT;
  text: string;
  category: CategoryId;
  selfSubmitted: boolean;
  partnerSubmitted: boolean;
}

export interface MatchCandidateView {
  candidateId: string;
  theme: string;
  discussionPrompt: string;
  compatibility: "shared" | "complementary";
}

interface BaseRoomView {
  roomId: string;
  code: string;
  version: number;
  self: PlayerIdentityView;
  partner: PartnerView;
  busy: BusyState;
  aiMode: AiMode;
}

export interface LobbyRoomView extends BaseRoomView {
  phase: "lobby";
}

export interface PreferencesRoomView extends BaseRoomView {
  phase: "preferences";
  preferences: {
    selfSubmitted: boolean;
    partnerSubmitted: boolean;
    retryReason: "no_shared_categories" | null;
  };
}

export interface QuestionsRoomView extends BaseRoomView {
  phase: "questions";
  question: QuestionView;
}

export interface ReviewRoomView extends BaseRoomView {
  phase: "review";
  review: {
    candidates: MatchCandidateView[];
    selfSubmitted: boolean;
    partnerSubmitted: boolean;
  };
}

export interface DiscussionRoomView extends BaseRoomView {
  phase: "discussion";
  discussion: {
    candidate: MatchCandidateView;
    ordinal: number;
    total: number;
    selfReady: boolean;
    partnerReady: boolean;
  };
}

export interface CompleteRoomView extends BaseRoomView {
  phase: "complete";
  complete: {
    summary: string;
    approvedCount: number;
  };
}

export type RoomView =
  | LobbyRoomView
  | PreferencesRoomView
  | QuestionsRoomView
  | ReviewRoomView
  | DiscussionRoomView
  | CompleteRoomView;

export interface SessionResponse {
  playerToken: string;
  view: RoomView;
}

export interface ViewResponse {
  view: RoomView;
}

export interface ApiErrorResponse {
  error: {
    code:
      | "BAD_REQUEST"
      | "ROOM_NOT_FOUND"
      | "ROOM_FULL"
      | "UNAUTHORIZED"
      | "INVALID_PHASE"
      | "ALREADY_SUBMITTED"
      | "INTERNAL_ERROR";
    message: string;
  };
}
