import type { AiResult, GameAiPort } from "@/lib/game/ports";

import {
  createFallbackQuestions,
  createFallbackSummary,
} from "@/lib/ai/fallbacks";
import { createFallbackMatches } from "@/lib/ai/matching";
import {
  validateApprovedCandidates,
  validateGeneratedMatches,
  validateGeneratedQuestions,
  validateScribeSummary,
} from "@/lib/ai/validation";

const OPERATION_TIMEOUT_MS = 7_800;

function fallback<T>(value: T): AiResult<T> {
  return { value, mode: "fallback" };
}

function openAi<T>(value: T): AiResult<T> {
  return { value, mode: "openai" };
}

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function runBounded<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("AI operation timed out"));
    }, OPERATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

class ResilientGameAi implements GameAiPort {
  async generateQuestions(
    input: Parameters<GameAiPort["generateQuestions"]>[0],
  ): ReturnType<GameAiPort["generateQuestions"]> {
    const curated = createFallbackQuestions(input);
    if (!hasOpenAiKey()) {
      return fallback(curated);
    }

    try {
      const generated = await runBounded(async (signal) => {
        const provider = await import("@/lib/ai/openai-provider");
        return provider.generateOpenAiQuestions(input, signal);
      });
      const validated = validateGeneratedQuestions(generated, input);
      return validated ? openAi(validated) : fallback(curated);
    } catch {
      return fallback(curated);
    }
  }

  async analyzeMatches(
    input: Parameters<GameAiPort["analyzeMatches"]>[0],
  ): ReturnType<GameAiPort["analyzeMatches"]> {
    const curated = createFallbackMatches(input.evidence);
    if (!hasOpenAiKey()) {
      return fallback(curated);
    }

    try {
      const generated = await runBounded(async (signal) => {
        const provider = await import("@/lib/ai/openai-provider");
        return provider.analyzeOpenAiMatches(input, signal);
      });
      const validated = validateGeneratedMatches(generated, input.evidence);
      return validated ? openAi(validated) : fallback(curated);
    } catch {
      return fallback(curated);
    }
  }

  async writeSummary(
    input: Parameters<GameAiPort["writeSummary"]>[0],
  ): ReturnType<GameAiPort["writeSummary"]> {
    const approved = validateApprovedCandidates(input.approved);
    if (!approved) {
      return fallback(createFallbackSummary([]));
    }

    const curated = createFallbackSummary(approved);
    if (!hasOpenAiKey() || approved.length === 0) {
      return fallback(curated);
    }

    try {
      const generated = await runBounded(async (signal) => {
        const provider = await import("@/lib/ai/openai-provider");
        return provider.writeOpenAiSummary(
          { approved },
          signal,
        );
      });
      const validated = validateScribeSummary(generated, approved);
      return validated ? openAi(validated) : fallback(curated);
    } catch {
      return fallback(curated);
    }
  }
}

let gameAi: GameAiPort | undefined;

export function getGameAi(): GameAiPort {
  gameAi ??= new ResilientGameAi();
  return gameAi;
}

export type { GameAiPort } from "@/lib/game/ports";
