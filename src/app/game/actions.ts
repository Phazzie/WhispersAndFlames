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
import { generateSessionImage } from '@/lib/image-generation';

function getFallbackQuestion(): string {
  // This provides a simple, generic fallback that is unlikely to have been asked.
  return "What's one secret you've never told your partner about something you find attractive in them?";
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
  const isDev = process.env.NODE_ENV === 'development';
  const startTime = isDev ? Date.now() : 0;

  try {
    if (isDev) console.log('[AI] Starting question generation...');

    // Retry up to 3 times
    for (let i = 0; i < 3; i++) {
      try {
        const result = await withTimeout(generateContextualQuestions(input), 8000); // 8-second timeout
        if (result.question) {
          if (isDev) {
            const elapsed = Date.now() - startTime;
            console.log(`[AI] Question generated successfully in ${elapsed}ms`);
          }
          return { question: result.question };
        }
      } catch (error) {
        console.error(`AI question generation attempt ${i + 1} failed:`, error);
        if (i === 2) {
          // Last attempt failed
          throw new Error('AI service is currently unavailable after multiple attempts.');
        }
      }
    }
    // This part should be unreachable, but as a safeguard:
    return { question: getFallbackQuestion() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isDev) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI] Question generation failed after ${elapsed}ms:`, errorMessage);
    }
    console.error('AI question generation failed permanently:', errorMessage);
    return { error: 'The AI is taking too long to respond. Please try again in a moment.' };
  }
}

export async function analyzeAndSummarizeAction(
  input: AnalyzeAnswersInput
): Promise<{ summary: string } | { error: string }> {
  const isDev = process.env.NODE_ENV === 'development';
  const startTime = isDev ? Date.now() : 0;

  try {
    if (isDev) console.log('[AI] Starting summary generation...');

    const result = await withTimeout(analyzeAnswersAndGenerateSummary(input), 8000); // 8-second timeout for Vercel limits
    if (result.summary) {
      if (isDev) {
        const elapsed = Date.now() - startTime;
        console.log(`[AI] Summary generated successfully in ${elapsed}ms`);
      }
      return { summary: result.summary };
    }
    throw new Error('Failed to get summary from AI.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isDev) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI] Summary generation failed after ${elapsed}ms:`, errorMessage);
    }
    console.error('AI summary generation failed:', errorMessage);
    return { error: 'Could not generate a summary at this time. Please try again later.' };
  }
}

export async function generateTherapistNotesAction(
  input: TherapistNotesInput
): Promise<{ notes: string } | { error: string }> {
  const isDev = process.env.NODE_ENV === 'development';
  const startTime = isDev ? Date.now() : 0;

  try {
    if (isDev) console.log('[AI] Starting therapist notes generation...');

    const result = await withTimeout(generateTherapistNotes(input), 8000); // 8-second timeout for Vercel limits
    if (result.notes) {
      if (isDev) {
        const elapsed = Date.now() - startTime;
        console.log(`[AI] Therapist notes generated successfully in ${elapsed}ms`);
      }
      return { notes: result.notes };
    }
    throw new Error('Failed to get therapist notes from AI.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isDev) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI] Therapist notes generation failed after ${elapsed}ms:`, errorMessage);
    }
    console.error('AI therapist notes generation failed:', errorMessage);
    return { error: 'Could not generate therapist notes at this time. Please try again later.' };
  }
}

export async function generateVisualMemoryAction(
  summary: string,
  spicyLevel: string,
  sharedThemes: string[]
): Promise<{ imageUrl: string; prompt: string } | { error: string }> {
  const isDev = process.env.NODE_ENV === 'development';
  const startTime = isDev ? Date.now() : 0;

  try {
    if (isDev) console.log('[AI] Starting visual memory generation...');

    const result = await withTimeout(generateSessionImage(summary, spicyLevel, sharedThemes), 8000); // 8-second timeout for Vercel limits

    if (result !== null) {
      if (isDev) {
        const elapsed = Date.now() - startTime;
        console.log(`[AI] Visual memory generated successfully in ${elapsed}ms`);
      }
      return result;
    }
    throw new Error('Failed to generate visual memory.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isDev) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI] Visual memory generation failed after ${elapsed}ms:`, errorMessage);
    }
    console.error('AI visual memory generation failed:', errorMessage);
    return { error: 'Could not generate visual memory at this time. Please try again later.' };
  }
}
