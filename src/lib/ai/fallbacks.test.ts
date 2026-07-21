import { describe, expect, it } from "vitest";

import { categoryIds, intensityIds } from "@/lib/game/contracts";

import { createFallbackQuestions } from "@/lib/ai/fallbacks";

describe("Ember fallback question bank", () => {
  it.each(intensityIds)(
    "returns eight unique, partner-focused questions at %s intensity",
    (intensity) => {
      for (const category of categoryIds) {
        const questions = createFallbackQuestions({
          categories: [category],
          intensity,
        });

        expect(questions).toHaveLength(8);
        expect(new Set(questions.map(({ text }) => text))).toHaveLength(8);
        expect(questions.every((question) => question.category === category)).toBe(
          true,
        );
        expect(
          questions.every(({ text }) => /\byour partner\b/i.test(text)),
        ).toBe(true);
      }
    },
  );

  it("rotates only through the selected categories", () => {
    const questions = createFallbackQuestions({
      categories: ["fantasy", "connection"],
      intensity: "medium",
    });

    expect(questions.map(({ category }) => category)).toEqual([
      "fantasy",
      "connection",
      "fantasy",
      "connection",
      "fantasy",
      "connection",
      "fantasy",
      "connection",
    ]);
  });

  it("keeps mild content below the explicit ceiling while hot stays candid", () => {
    const mild = createFallbackQuestions({
      categories: ["attraction"],
      intensity: "mild",
    });
    const hot = createFallbackQuestions({
      categories: ["attraction"],
      intensity: "hot",
    });

    expect(mild.map(({ text }) => text).join(" ")).not.toMatch(
      /\b(?:explicit|sexual|naked|surrender)\b/i,
    );
    expect(hot.map(({ text }) => text).join(" ")).toMatch(
      /\b(?:explicit|desire|heat)\b/i,
    );
  });

  it("moves from noticing into planning across the eight-question arc", () => {
    const questions = createFallbackQuestions({
      categories: ["fantasy"],
      intensity: "medium",
    });

    expect(questions.slice(0, 2).map(({ text }) => text).join(" ")).toMatch(
      /setting|scene/i,
    );
    expect(questions.slice(2, 6).map(({ text }) => text).join(" ")).toMatch(
      /want|vulnerable|wish/i,
    );
    expect(questions.slice(6).map(({ text }) => text).join(" ")).toMatch(
      /plan|invitation/i,
    );
  });
});
