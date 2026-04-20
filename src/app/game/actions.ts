'use server';

import {
  analyzeAnswersAndGenerateSummary,
  AnalyzeAnswersInput,
} from '@/ai/flows/analyze-answers-and-generate-summary';
import {
  generateContextualQuestions,
  GenerateContextualQuestionsInput,
} from '@/ai/flows/generate-contextual-questions';
import { generateTherapistNotes, TherapistNotesInput } from '@/ai/flows/generate-therapist-notes';
import {
  AI_IMAGE_TIMEOUT_MS,
  AI_MAX_RETRIES,
  AI_QUESTION_TIMEOUT_MS,
  AI_SUMMARY_TIMEOUT_MS,
  AI_THERAPIST_NOTES_TIMEOUT_MS,
} from '@/lib/api-constants';
import { generateSessionImage } from '@/lib/image-generation';
import { createLogger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/utils/retry';

const logger = createLogger('game-actions');
const IS_DEV = process.env.NODE_ENV === 'development';

const FALLBACK_QUESTIONS = [
  "What's one secret you've never told your partner about something you find attractive in them?",
  'Describe a specific moment when you felt completely understood by your partner.',
  'If you could relive one moment from your relationship in perfect detail, which would it be and why?',
  "What's something your partner does unconsciously that you find irresistible?",
  'Tell your partner about a time they made you feel truly seen — what were they doing?',
  "What's one thing about your partner's personality that surprised you as you got to know them?",
  'Describe the exact moment you knew this relationship was something different.',
  "What's a small, everyday thing your partner does that you never want to take for granted?",
  "If your partner could read your mind right now, what's one thought you'd want them to see?",
  "What's something you've always wanted to ask your partner but haven't found the right moment?",
];

function getFallbackQuestion(): string {
  return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AI operation timed out'));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

export async function generateQuestionAction(
  input: GenerateContextualQuestionsInput
): Promise<{ question: string } | { error: string }> {
  const startTime = IS_DEV ? Date.now() : 0;

  try {
    if (IS_DEV) logger.debug('Starting question generation');

    const result = await withRetry(
      async () => {
        const r = await withTimeout(generateContextualQuestions(input), AI_QUESTION_TIMEOUT_MS);
        if (!r.question || r.question.length < 20 || r.question.length > 500) {
          throw new Error(`Invalid question length: ${r.question?.length ?? 0}`);
        }
        return r;
      },
      AI_MAX_RETRIES,
      200
    );
    if (IS_DEV) {
      const elapsed = Date.now() - startTime;
      logger.debug('Question generated successfully', { elapsedMs: elapsed });
    }
    return { question: result.question };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (IS_DEV) {
      const elapsed = Date.now() - startTime;
      logger.error('Question generation failed', undefined, { elapsedMs: elapsed, errorMessage });
    }
    logger.error('AI question generation failed permanently', undefined, { errorMessage });
    return { error: 'The AI is taking too long to respond. Please try again in a moment.' };
  }
}

export async function analyzeAndSummarizeAction(
  input: AnalyzeAnswersInput
): Promise<{ summary: string } | { error: string }> {
  try {
    const result = await withRetry(
      async () => withTimeout(analyzeAnswersAndGenerateSummary(input), AI_SUMMARY_TIMEOUT_MS),
      AI_MAX_RETRIES,
      200
    );
    if (result.summary && result.summary.length >= 100) {
      return { summary: result.summary };
    }
    return { error: 'Failed to generate summary after multiple attempts.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Summary generation failed', undefined, { errorMessage });
    return { error: 'Failed to generate summary after multiple attempts.' };
  }
}

export async function generateTherapistNotesAction(
  input: TherapistNotesInput
): Promise<{ notes: string } | { error: string }> {
  try {
    const result = await withRetry(
      async () => withTimeout(generateTherapistNotes(input), AI_THERAPIST_NOTES_TIMEOUT_MS),
      AI_MAX_RETRIES,
      200
    );
    if (result.notes && result.notes.length >= 100) {
      return { notes: result.notes };
    }
    return { error: 'Could not generate therapist notes at this time. Please try again later.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Therapist notes generation failed', undefined, { errorMessage });
    return { error: 'Could not generate therapist notes at this time. Please try again later.' };
  }
}

export async function generateVisualMemoryAction(
  summary: string,
  spicyLevel: string,
  sharedThemes: string[]
): Promise<{ imageUrl: string; prompt: string } | { error: string }> {
  try {
    const result = await withRetry(
      async () =>
        withTimeout(generateSessionImage(summary, spicyLevel, sharedThemes), AI_IMAGE_TIMEOUT_MS),
      AI_MAX_RETRIES,
      200
    );
    if (result !== null) {
      return result;
    }
    return { error: 'Could not generate visual memory at this time. Please try again later.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Visual memory generation failed', undefined, { errorMessage });
    return { error: 'Could not generate visual memory at this time. Please try again later.' };
  }
}
