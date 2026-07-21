import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type {
  CategoryId,
  IntensityId,
  MatchCandidateView,
} from "@/lib/game/contracts";
import type { MatchEvidence } from "@/lib/game/ports";

import {
  buildEmberMessages,
  buildMatchMessages,
  buildScribeMessages,
} from "@/lib/ai/prompts";
import {
  generatedQuestionSetSchema,
  matchCandidateSetSchema,
} from "@/lib/ai/schemas";

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
const REQUEST_TIMEOUT_MS = 7_800;

let client: OpenAI | undefined;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OpenAI is not configured");
  }
  client ??= new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return client;
}

function getModel(): string {
  const model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  if (!model.trim()) {
    throw new Error("OpenAI model is not configured");
  }
  return model;
}

export async function generateOpenAiQuestions(
  input: { categories: CategoryId[]; intensity: IntensityId },
  signal: AbortSignal,
): Promise<unknown> {
  const response = await getClient().responses.parse(
    {
      model: getModel(),
      input: buildEmberMessages(input),
      text: {
        format: zodTextFormat(
          generatedQuestionSetSchema,
          "ember_question_set_v1",
        ),
      },
      max_output_tokens: 1_500,
      store: false,
    },
    { signal, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS },
  );

  return response.output_parsed;
}

export async function analyzeOpenAiMatches(
  input: { evidence: MatchEvidence[] },
  signal: AbortSignal,
): Promise<unknown> {
  const response = await getClient().responses.parse(
    {
      model: getModel(),
      input: buildMatchMessages(input),
      text: {
        format: zodTextFormat(
          matchCandidateSetSchema,
          "match_candidate_set_v1",
        ),
      },
      max_output_tokens: 900,
      store: false,
    },
    { signal, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS },
  );

  return response.output_parsed;
}

export async function writeOpenAiSummary(
  input: {
    approved: MatchCandidateView[];
  },
  signal: AbortSignal,
): Promise<unknown> {
  const response = await getClient().responses.create(
    {
      model: getModel(),
      input: buildScribeMessages({ approved: input.approved }),
      max_output_tokens: 500,
      store: false,
    },
    { signal, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS },
  );

  return response.output_text;
}
