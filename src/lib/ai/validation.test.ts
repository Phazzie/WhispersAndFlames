import { describe, expect, it } from "vitest";

import { createFallbackQuestions } from "@/lib/ai/fallbacks";
import { validateGeneratedQuestions } from "@/lib/ai/validation";

describe("Ember output validation", () => {
  it("accepts a complete, selected-category fallback set", () => {
    const input = { categories: ["connection"] as const, intensity: "mild" as const };
    const questions = createFallbackQuestions({
      categories: [...input.categories],
      intensity: input.intensity,
    });

    expect(
      validateGeneratedQuestions({ questions }, {
        categories: [...input.categories],
        intensity: input.intensity,
      }),
    ).toEqual(questions);
  });

  it("fails closed on repetition, wrong categories, or over-ceiling content", () => {
    const questions = createFallbackQuestions({
      categories: ["connection"],
      intensity: "mild",
    });

    expect(
      validateGeneratedQuestions(
        { questions: questions.map(() => questions[0]) },
        { categories: ["connection"], intensity: "mild" },
      ),
    ).toBeNull();

    expect(
      validateGeneratedQuestions(
        {
          questions: questions.map((question) => ({
            ...question,
            category: "fantasy",
          })),
        },
        { categories: ["connection"], intensity: "mild" },
      ),
    ).toBeNull();

    expect(
      validateGeneratedQuestions(
        {
          questions: questions.map((question, index) =>
            index === 0
              ? {
                  ...question,
                  text: "What explicit sexual scene would your partner plan?",
                }
              : question,
          ),
        },
        { categories: ["connection"], intensity: "mild" },
      ),
    ).toBeNull();
  });
});
