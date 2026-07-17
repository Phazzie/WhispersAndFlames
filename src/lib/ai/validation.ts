import type {
  CategoryId,
  IntensityId,
  MatchCandidateView,
} from "@/lib/game/contracts";
import type {
  GameQuestionContent,
  MatchCandidateProposal,
  MatchEvidence,
} from "@/lib/game/ports";

import {
  canonicalizeSupportedCandidate,
  meaningfulTokens,
} from "@/lib/ai/matching";
import {
  generatedQuestionSetSchema,
  matchCandidateProposalSchema,
  matchCandidateSetSchema,
  scribeSummarySchema,
} from "@/lib/ai/schemas";

const DANGEROUS_QUESTION_LANGUAGE =
  /\b(?:minor|child|teen|drugged|intoxicated|unconscious|asleep|force(?:d)?|coerc(?:e|ion)|ignore\s+(?:a\s+)?no)\b|without\s+(?:asking|permission|consent)/i;
const CRUDE_LANGUAGE =
  /\b(?:cunt|cock|dick|pussy|fuck(?:ing|ed)?|genitals?|penetrat(?:e|ion)|orgasm)\b/i;
const MILD_CEILING =
  /\b(?:explicit|naked|nude|rough|dominant|submission|surrender|sexual|sex)\b/i;
const YES_NO_OPENING =
  /^(?:are|can|could|did|do|does|has|have|is|should|was|were|will|would)\b/i;
const ATTRIBUTION_OR_SOURCE_LANGUAGE =
  /\b(?:player\s*[ab12]|partner\s*[ab12]|one\s+of\s+you|the\s+other\s+(?:player|person)|you\s+(?:answered|said|wrote)|they\s+(?:answered|said|wrote)|answer(?:ed|s)?|response(?:s)?|ordinal|source\s*(?:id)?|question\s*#?\d+)\b/i;
const QUOTATION_MARKS = /["“”]/;
const INSTRUCTION_OR_MARKUP_LANGUAGE =
  /\b(?:ignore|override|reveal)\s+(?:all\s+)?(?:previous|prior|above|developer|system|instructions?|prompts?)\b|<\/?[a-z][^>]*>/i;

function normalizedQuestion(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isQuestionSafe(text: string, intensity: IntensityId): boolean {
  if (!/\byour partner\b/i.test(text)) {
    return false;
  }
  if (/\r|\n/.test(text) || INSTRUCTION_OR_MARKUP_LANGUAGE.test(text)) {
    return false;
  }
  if (!text.endsWith("?") || (text.match(/\?/g)?.length ?? 0) !== 1) {
    return false;
  }
  if (YES_NO_OPENING.test(text) || DANGEROUS_QUESTION_LANGUAGE.test(text)) {
    return false;
  }
  if (CRUDE_LANGUAGE.test(text)) {
    return false;
  }
  return intensity !== "mild" || !MILD_CEILING.test(text);
}

export function validateGeneratedQuestions(
  value: unknown,
  input: { categories: CategoryId[]; intensity: IntensityId },
): GameQuestionContent[] | null {
  const parsed = generatedQuestionSetSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const allowedCategories = new Set(input.categories);
  const seen = new Set<string>();
  for (const question of parsed.data.questions) {
    const normalized = normalizedQuestion(question.text);
    if (
      !allowedCategories.has(question.category) ||
      seen.has(normalized) ||
      !isQuestionSafe(question.text, input.intensity)
    ) {
      return null;
    }
    seen.add(normalized);
  }

  return parsed.data.questions;
}

function containsSourceFragment(
  candidate: MatchCandidateProposal,
  evidence: MatchEvidence[],
): boolean {
  const candidateText = `${candidate.theme} ${candidate.discussionPrompt}`;
  const candidateTokens = meaningfulTokens(candidateText);
  const candidateTriples = new Set(
    candidateTokens
      .slice(0, -2)
      .map((_, index) => candidateTokens.slice(index, index + 3).join(" ")),
  );

  return evidence.some((item) =>
    [item.playerAAnswer, item.playerBAnswer].some((answer) => {
      if (!answer) {
        return false;
      }
      const compactAnswer = answer.trim().toLocaleLowerCase("en");
      if (
        compactAnswer.length >= 12 &&
        candidateText.toLocaleLowerCase("en").includes(compactAnswer)
      ) {
        return true;
      }
      const answerTokens = meaningfulTokens(answer);
      return answerTokens
        .slice(0, -2)
        .some((_, index) =>
          candidateTriples.has(answerTokens.slice(index, index + 3).join(" ")),
        );
    }),
  );
}

function candidateTextIsSanitized(candidate: MatchCandidateProposal): boolean {
  const text = `${candidate.theme} ${candidate.discussionPrompt}`;
  return (
    !ATTRIBUTION_OR_SOURCE_LANGUAGE.test(text) &&
    !QUOTATION_MARKS.test(text) &&
    !DANGEROUS_QUESTION_LANGUAGE.test(text) &&
    !INSTRUCTION_OR_MARKUP_LANGUAGE.test(text)
  );
}

export function validateGeneratedMatches(
  value: unknown,
  evidence: MatchEvidence[],
): MatchCandidateProposal[] | null {
  const parsed = matchCandidateSetSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const themes = new Set<string>();
  const sanitized: MatchCandidateProposal[] = [];
  for (const candidate of parsed.data.candidates) {
    const canonical = canonicalizeSupportedCandidate(candidate, evidence);
    const themeKey = canonical?.theme.toLocaleLowerCase("en");
    if (
      !themeKey ||
      themes.has(themeKey) ||
      !candidateTextIsSanitized(candidate) ||
      containsSourceFragment(candidate, evidence) ||
      !canonical
    ) {
      return null;
    }
    themes.add(themeKey);
    sanitized.push(canonical);
  }

  return sanitized;
}

export function validateApprovedCandidates(
  approved: MatchCandidateView[],
): MatchCandidateView[] | null {
  if (approved.length > 4) {
    return null;
  }
  const sanitized: MatchCandidateView[] = [];
  for (const candidate of approved) {
    const parsed = matchCandidateProposalSchema.safeParse({
      theme: candidate.theme,
      discussionPrompt: candidate.discussionPrompt,
      compatibility: candidate.compatibility,
    });
    if (!parsed.success || !candidateTextIsSanitized(parsed.data)) {
      return null;
    }
    sanitized.push({
      candidateId: candidate.candidateId,
      ...parsed.data,
    });
  }
  return sanitized;
}

export function validateScribeSummary(
  value: unknown,
  approved: MatchCandidateView[],
): string | null {
  const parsed = scribeSummarySchema.safeParse(value);
  if (!parsed.success || approved.length === 0) {
    return null;
  }

  const summary = parsed.data;
  if (
    ATTRIBUTION_OR_SOURCE_LANGUAGE.test(summary) ||
    QUOTATION_MARKS.test(summary) ||
    INSTRUCTION_OR_MARKUP_LANGUAGE.test(summary) ||
    /\b(?:you\s+(?:both\s+)?(?:agreed|consented)|you\s+(?:should|must|need\s+to))\b/i.test(
      summary,
    )
  ) {
    return null;
  }

  const summaryTokens = new Set(meaningfulTokens(summary));
  const namesAnApprovedTheme = approved.some(({ theme }) =>
    meaningfulTokens(theme).some((token) => summaryTokens.has(token)),
  );
  return namesAnApprovedTheme ? summary : null;
}
