import { z } from "zod";

import { categorySchema } from "@/lib/game/contracts";

export const generatedQuestionSchema = z
  .object({
    text: z.string().trim().min(20).max(280),
    category: categorySchema,
  })
  .strict();

export const generatedQuestionSetSchema = z
  .object({
    questions: z.array(generatedQuestionSchema).length(8),
  })
  .strict();

export const matchCandidateProposalSchema = z
  .object({
    theme: z.string().trim().min(3).max(64),
    discussionPrompt: z.string().trim().min(12).max(220),
    compatibility: z.enum(["shared", "complementary"]),
  })
  .strict();

export const matchCandidateSetSchema = z
  .object({
    candidates: z.array(matchCandidateProposalSchema).max(4),
  })
  .strict();

export const scribeSummarySchema = z.string().trim().min(40).max(900);
