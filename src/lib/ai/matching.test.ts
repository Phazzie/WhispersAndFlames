import { describe, expect, it } from "vitest";

import type { MatchEvidence } from "@/lib/game/ports";

import { createFallbackMatches } from "@/lib/ai/matching";
import { validateGeneratedMatches } from "@/lib/ai/validation";

function evidence(
  playerAAnswer: string | null,
  playerBAnswer: string | null,
): MatchEvidence[] {
  return [
    {
      ordinal: 1,
      question: "What kind of moment draws you toward your partner?",
      playerAAnswer,
      playerBAnswer,
    },
  ];
}

describe("private match analysis", () => {
  it("creates a sanitized proposal only when both players support a theme", () => {
    const input = evidence(
      "I like slow kisses that build anticipation.",
      "Kissing is best when we let the tension linger.",
    );
    const proposals = createFallbackMatches(input);

    expect(proposals).toHaveLength(2);
    expect(proposals[0]).toEqual({
      theme: "The pleasure of anticipation",
      discussionPrompt:
        "What helps anticipation feel exciting and connected for both of you?",
      compatibility: "shared",
    });
    expect(Object.keys(proposals[0] ?? {}).sort()).toEqual([
      "compatibility",
      "discussionPrompt",
      "theme",
    ]);
    expect(JSON.stringify(proposals)).not.toContain("slow kisses");
    expect(JSON.stringify(proposals)).not.toContain("ordinal");
  });

  it("returns zero for unrelated solo interests", () => {
    expect(
      createFallbackMatches(
        evidence(
          "A quiet sunrise walk on the beach sounds perfect.",
          "I enjoy receiving clever compliments over dinner.",
        ),
      ),
    ).toEqual([]);
  });

  it("does not turn a negated preference into common ground", () => {
    expect(
      createFallbackMatches(
        evidence(
          "Kissing is the part I enjoy most.",
          "I am definitely not interested in kissing.",
        ),
      ),
    ).toEqual([]);
  });

  it("rejects provider proposals that expose answer fragments", () => {
    const input = evidence(
      "Slow kisses under warm lights feel perfect.",
      "I love slow kisses under warm lights too.",
    );

    expect(
      validateGeneratedMatches(
        {
          candidates: [
            {
              theme: "Kissing chemistry",
              discussionPrompt:
                "How do slow kisses under warm lights create connection for both of you?",
              compatibility: "shared",
            },
          ],
        },
        input,
      ),
    ).toBeNull();
  });

  it("canonicalizes a supported provider theme to a non-attributing prompt", () => {
    const input = evidence(
      "I enjoy playful teasing and silly games.",
      "Playful jokes and laughter help me relax.",
    );

    expect(
      validateGeneratedMatches(
        {
          candidates: [
            {
              theme: "Playful energy",
              discussionPrompt:
                "What kind of shared playfulness would feel inviting for you?",
              compatibility: "shared",
            },
          ],
        },
        input,
      ),
    ).toEqual([
      {
        theme: "Playful energy",
        discussionPrompt:
          "How could you invite more playful energy without making it feel forced?",
        compatibility: "shared",
      },
    ]);
  });

  it("rejects a provider candidate supported by only one player", () => {
    const input = evidence(
      "Playful teasing and silly games are my favorite.",
      "I value quiet reassurance and trust.",
    );

    expect(
      validateGeneratedMatches(
        {
          candidates: [
            {
              theme: "Playful energy",
              discussionPrompt:
                "How could you invite more playful energy without pressure?",
              compatibility: "shared",
            },
          ],
        },
        input,
      ),
    ).toBeNull();
  });
});
