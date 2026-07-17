import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildEmberMessages,
  buildScribeMessages,
} from "@/lib/ai/prompts";
import {
  AI_PERSONAS_SHA256,
  EMBER_PROMPT_SHA256,
  loadCanonicalEmberPrompt,
  loadCanonicalPersonaDocument,
  loadCanonicalScribePersona,
} from "@/lib/ai/provenance";

describe("versioned AI prompt layers", () => {
  it("loads the complete canonical Ember prompt verbatim", () => {
    const canonicalFile = readFileSync(
      new URL("../../../aiprompting.md", import.meta.url),
      "utf8",
    );

    expect(loadCanonicalEmberPrompt()).toBe(canonicalFile);
    expect(EMBER_PROMPT_SHA256).toBe(
      "6d0eccc387c59b42c439851061b190ea0b4b817090b84602277b9768d5c4ccee",
    );
  });

  it("keeps persona, runtime safety, task, and context as separate layers", () => {
    const messages = buildEmberMessages({
      categories: ["connection", "playfulness"],
      intensity: "medium",
    });

    expect(messages).toHaveLength(4);
    expect(messages[0]?.content).toBe(loadCanonicalEmberPrompt());
    expect(messages[1]?.content).toContain("RUNTIME SAFETY LAYER");
    expect(messages[2]?.content).toContain("Questions 1-2, NOTICING");
    expect(messages[2]?.content).toContain("Questions 3-4, WANTING");
    expect(messages[2]?.content).toContain("Questions 5-6, CONFESSING");
    expect(messages[2]?.content).toContain("Questions 7-8, PLANNING");
    expect(JSON.parse(messages[3]?.content ?? "{}")).toEqual({
      selectedCategories: ["connection", "playfulness"],
      selectedIntensity: "medium",
      playerCount: 2,
      requiredQuestionCount: 8,
    });
  });

  it("uses the complete checksum-verified Scribe persona section", () => {
    const personaDocument = readFileSync(
      new URL("../../../AI_PERSONAS.md", import.meta.url),
      "utf8",
    );
    const start = personaDocument.indexOf("## 2. Scribe: The Storyteller");
    const end = personaDocument.indexOf(
      "\n---\n\n## Technical Implementation",
      start,
    );

    expect(loadCanonicalPersonaDocument()).toBe(personaDocument);
    expect(loadCanonicalScribePersona()).toBe(personaDocument.slice(start, end));
    expect(AI_PERSONAS_SHA256).toBe(
      "4c14eddfb978f5a417eeb28e5d1db23f3b192f1b7df99617b730cfc5384f7687",
    );
  });

  it("gives Scribe only approved sanitized fields", () => {
    const messages = buildScribeMessages({
      approved: [
        {
          candidateId: "8ba806b5-21fc-4d5a-b7e7-7d4827753928",
          theme: "Playful energy",
          discussionPrompt: "How could you invite more playfulness together?",
          compatibility: "shared",
        },
      ],
    });
    const payload = JSON.parse(messages.at(-1)?.content ?? "{}");

    expect(payload).toEqual({
      approvedThemes: [
        {
          theme: "Playful energy",
          discussionPrompt: "How could you invite more playfulness together?",
          compatibility: "shared",
        },
      ],
    });
    expect(messages.at(-1)?.content).not.toContain("Ash");
    expect(messages.at(-1)?.content).not.toContain("Rowan");
    expect(messages.at(-1)?.content).not.toContain("candidateId");
    expect(messages.slice(0, -1).map(({ content }) => content).join(" ")).toMatch(
      /entire evidence boundary/i,
    );
  });
});
