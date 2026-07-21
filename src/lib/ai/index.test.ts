import { afterEach, describe, expect, it, vi } from "vitest";

import { getGameAi } from "@/lib/ai";

afterEach(() => {
  vi.unstubAllEnvs();
});
describe("getGameAi missing-key behavior", () => {
  it("returns the full curated Ember arc without making a provider call", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = await getGameAi().generateQuestions({
      categories: ["connection", "fantasy"],
      intensity: "mild",
    });

    expect(result.mode).toBe("fallback");
    expect(result.value).toHaveLength(8);
    expect(new Set(result.value.map(({ text }) => text))).toHaveLength(8);
  });

  it("uses conservative fallback matching without exposing source answers", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const privatePhrase = "slow kisses that build delicious tension";

    const result = await getGameAi().analyzeMatches({
      evidence: [
        {
          ordinal: 1,
          question: "What draws you toward your partner?",
          playerAAnswer: privatePhrase,
          playerBAnswer: "I also enjoy kissing when anticipation can linger.",
        },
      ],
    });

    expect(result.mode).toBe("fallback");
    expect(result.value.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.value)).not.toContain(privatePhrase);
  });

  it("writes an honest zero-match ending from no private input", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = await getGameAi().writeSummary({
      playerNames: ["Ash", "Rowan"],
      approved: [],
    });

    expect(result.mode).toBe("fallback");
    expect(result.value).toMatch(/No shared spark needed to be invented/i);
  });

  it("writes from approved sanitized candidates only", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = await getGameAi().writeSummary({
      playerNames: ["Ash", "Rowan"],
      approved: [
        {
          candidateId: "8ba806b5-21fc-4d5a-b7e7-7d4827753928",
          theme: "Trust and openness",
          discussionPrompt:
            "What helps honest curiosity feel safe and reciprocal between you?",
          compatibility: "shared",
        },
      ],
    });

    expect(result.mode).toBe("fallback");
    expect(result.value).toContain("Trust and openness");
    expect(result.value).not.toMatch(/answered|ballot|rejected/i);
  });
});
