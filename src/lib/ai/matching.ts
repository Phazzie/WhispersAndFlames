import type { MatchEvidence, MatchCandidateProposal } from "@/lib/game/ports";

interface ThemeDefinition {
  terms: readonly string[];
  proposal: MatchCandidateProposal;
  complementary?: {
    leading: readonly string[];
    following: readonly string[];
  };
}

const THEMES: readonly ThemeDefinition[] = [
  {
    terms: [
      "anticipation",
      "anticipate",
      "tease",
      "teasing",
      "tension",
      "slow",
      "linger",
      "waiting",
      "build",
      "patient",
    ],
    proposal: {
      theme: "The pleasure of anticipation",
      discussionPrompt:
        "What helps anticipation feel exciting and connected for both of you?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "affection",
      "affectionate",
      "cuddle",
      "cuddling",
      "hug",
      "hugging",
      "close",
      "closeness",
      "comfort",
      "warmth",
      "snuggle",
    ],
    proposal: {
      theme: "Affectionate closeness",
      discussionPrompt:
        "Which small kinds of closeness make each of you feel most connected?",
      compatibility: "shared",
    },
  },
  {
    terms: ["kiss", "kissing", "lips", "mouth", "makeout"],
    proposal: {
      theme: "Kissing chemistry",
      discussionPrompt:
        "What makes a kiss feel especially connected and memorable for both of you?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "touch",
      "touching",
      "hands",
      "caress",
      "massage",
      "skin",
      "neck",
      "shoulder",
      "back",
    ],
    proposal: {
      theme: "Intentional touch",
      discussionPrompt:
        "What makes touch feel attentive, welcome, and connecting for each of you?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "words",
      "voice",
      "whisper",
      "compliment",
      "praise",
      "affirmation",
    ],
    proposal: {
      theme: "Words that create connection",
      discussionPrompt:
        "What kind of words help each of you feel noticed and wanted?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "play",
      "playful",
      "tease",
      "teasing",
      "laugh",
      "laughter",
      "silly",
      "fun",
      "game",
      "joke",
      "mischief",
      "dare",
    ],
    proposal: {
      theme: "Playful energy",
      discussionPrompt:
        "How could you invite more playful energy without making it feel forced?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "new",
      "novelty",
      "adventure",
      "explore",
      "exploring",
      "spontaneous",
      "surprise",
      "experiment",
    ],
    proposal: {
      theme: "A little shared novelty",
      discussionPrompt:
        "What kind of new experience would feel inviting rather than pressured for both of you?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "attention",
      "present",
      "presence",
      "date",
      "ritual",
      "uninterrupted",
      "focus",
    ],
    proposal: {
      theme: "Undivided time together",
      discussionPrompt:
        "What would make dedicated time together feel genuinely restorative for you both?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "trust",
      "safe",
      "safety",
      "honest",
      "honesty",
      "open",
      "openness",
      "vulnerable",
      "vulnerability",
      "reassurance",
      "secure",
    ],
    proposal: {
      theme: "Trust and openness",
      discussionPrompt:
        "What helps honest curiosity feel safe and reciprocal between you?",
      compatibility: "shared",
    },
  },
  {
    terms: [
      "lead",
      "leading",
      "control",
      "dominant",
      "direct",
      "follow",
      "following",
      "guided",
      "surrender",
      "power",
    ],
    proposal: {
      theme: "Leading and following",
      discussionPrompt:
        "What agreements would make leading and following feel exciting and secure for both of you?",
      compatibility: "complementary",
    },
    complementary: {
      leading: ["lead", "leading", "control", "dominant", "direct"],
      following: ["follow", "following", "guided", "surrender"],
    },
  },
];

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "always",
  "and",
  "because",
  "been",
  "being",
  "both",
  "could",
  "does",
  "especially",
  "feel",
  "feels",
  "from",
  "have",
  "having",
  "into",
  "just",
  "like",
  "love",
  "makes",
  "more",
  "most",
  "partner",
  "really",
  "something",
  "specific",
  "that",
  "their",
  "them",
  "then",
  "there",
  "they",
  "thing",
  "think",
  "this",
  "together",
  "want",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

const NEGATIONS = new Set([
  "avoid",
  "dislike",
  "dont",
  "hate",
  "never",
  "no",
  "not",
  "wouldnt",
]);

function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .match(/[a-z0-9]+/g) ?? [];
}

function stem(token: string): string {
  if (token.length > 6 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }
  if (token.length > 5 && token.endsWith("ed")) {
    return token.slice(0, -2);
  }
  if (token.length > 5 && token.endsWith("es")) {
    return token.slice(0, -2);
  }
  if (token.length > 4 && token.endsWith("s")) {
    return token.slice(0, -1);
  }
  return token;
}

function hasPositiveTerm(answer: string, terms: readonly string[]): boolean {
  const tokens = tokenize(answer).map(stem);
  const wanted = new Set(terms.flatMap((term) => tokenize(term).map(stem)));

  return tokens.some((token, index) => {
    if (!wanted.has(token)) {
      return false;
    }
    const preceding = tokens.slice(Math.max(0, index - 5), index);
    return !preceding.some((item) => NEGATIONS.has(item));
  });
}

function playerAnswers(
  evidence: MatchEvidence[],
  player: "playerAAnswer" | "playerBAnswer",
): string[] {
  return evidence
    .map((item) => item[player])
    .filter((answer): answer is string => Boolean(answer?.trim()));
}

function themeSupport(
  theme: ThemeDefinition,
  playerA: string[],
  playerB: string[],
): "shared" | "complementary" | null {
  const supports = (answers: string[], terms: readonly string[]) =>
    answers.some((answer) => hasPositiveTerm(answer, terms));

  if (theme.complementary) {
    const aLeads = supports(playerA, theme.complementary.leading);
    const aFollows = supports(playerA, theme.complementary.following);
    const bLeads = supports(playerB, theme.complementary.leading);
    const bFollows = supports(playerB, theme.complementary.following);
    if ((aLeads && bFollows) || (aFollows && bLeads)) {
      return "complementary";
    }
  }

  return supports(playerA, theme.terms) && supports(playerB, theme.terms)
    ? "shared"
    : null;
}

function commonMeaningfulTokens(playerA: string[], playerB: string[]): Set<string> {
  const meaningful = (answers: string[]) =>
    new Set(
      answers.flatMap((answer) => {
        const tokens = tokenize(answer).map(stem);
        return tokens.filter((token, index) => {
          const preceding = tokens.slice(Math.max(0, index - 5), index);
          return (
            token.length >= 5 &&
            !STOP_WORDS.has(token) &&
            !preceding.some((item) => NEGATIONS.has(item))
          );
        });
      }),
    );
  const a = meaningful(playerA);
  const b = meaningful(playerB);
  return new Set([...a].filter((token) => b.has(token)));
}

export function createFallbackMatches(
  evidence: MatchEvidence[],
): MatchCandidateProposal[] {
  const playerA = playerAnswers(evidence, "playerAAnswer");
  const playerB = playerAnswers(evidence, "playerBAnswer");

  if (playerA.length === 0 || playerB.length === 0) {
    return [];
  }

  const proposals = THEMES.flatMap((theme) => {
    const support = themeSupport(theme, playerA, playerB);
    if (!support) {
      return [];
    }
    return [{ ...theme.proposal, compatibility: support }];
  }).slice(0, 4);

  if (proposals.length > 0) {
    return proposals;
  }

  if (commonMeaningfulTokens(playerA, playerB).size === 0) {
    return [];
  }

  return [
    {
      theme: "A shared detail worth exploring",
      discussionPrompt:
        "What makes this shared preference meaningful or inviting for each of you?",
      compatibility: "shared",
    },
  ];
}

export function canonicalizeSupportedCandidate(
  candidate: MatchCandidateProposal,
  evidence: MatchEvidence[],
): MatchCandidateProposal | null {
  const playerA = playerAnswers(evidence, "playerAAnswer");
  const playerB = playerAnswers(evidence, "playerBAnswer");
  if (playerA.length === 0 || playerB.length === 0) {
    return null;
  }

  for (const theme of THEMES) {
    const isNamed =
      candidate.theme.toLocaleLowerCase("en") ===
      theme.proposal.theme.toLocaleLowerCase("en");
    if (!isNamed) {
      continue;
    }
    const support = themeSupport(theme, playerA, playerB);
    if (support === null || candidate.compatibility !== support) {
      return null;
    }
    return { ...theme.proposal, compatibility: support };
  }

  if (
    candidate.theme.toLocaleLowerCase("en") ===
      "a shared detail worth exploring" &&
    candidate.compatibility === "shared" &&
    commonMeaningfulTokens(playerA, playerB).size > 0
  ) {
    return {
      theme: "A shared detail worth exploring",
      discussionPrompt:
        "What makes this shared preference meaningful or inviting for each of you?",
      compatibility: "shared",
    };
  }

  return null;
}

export function meaningfulTokens(value: string): string[] {
  return tokenize(value)
    .map(stem)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}
