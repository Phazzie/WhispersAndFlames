import { zodTextFormat } from "openai/helpers/zod";
import { describe, expect, it } from "vitest";

import {
  generatedQuestionSetSchema,
  matchCandidateSetSchema,
} from "@/lib/ai/schemas";

describe("OpenAI structured output schemas", () => {
  it("compiles the exact eight-question boundary", () => {
    const format = zodTextFormat(
      generatedQuestionSetSchema,
      "ember_question_set_v1",
    );
    const serialized = JSON.stringify(format);

    expect(format).toMatchObject({
      type: "json_schema",
      name: "ember_question_set_v1",
      strict: true,
    });
    expect(serialized).toContain('"minItems":8');
    expect(serialized).toContain('"maxItems":8');
    expect(serialized).toContain('"additionalProperties":false');
  });

  it("compiles the zero-to-four match proposal boundary", () => {
    const format = zodTextFormat(
      matchCandidateSetSchema,
      "match_candidate_set_v1",
    );
    const serialized = JSON.stringify(format);

    expect(format).toMatchObject({
      type: "json_schema",
      name: "match_candidate_set_v1",
      strict: true,
    });
    expect(serialized).toContain('"maxItems":4');
    expect(serialized).toContain('"additionalProperties":false');
  });
});
