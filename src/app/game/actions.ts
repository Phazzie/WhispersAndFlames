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

const FALLBACK_QUESTIONS = [
  "What's one secret you've never told your partner about something you find attractive in them?",
  'Describe a specific moment when you felt completely understood by your partner.',
  'If you could relive one moment from your relationship in perfect detail, which would it be and why?',
  "What's something your partner does unconsciously that you find irresistible?",
  "Tell your partner about a time they made you feel truly seen — what were they doing?",
  "What's one thing about your partner's personality that surprised you as you got to know them?",
  'Describe the exact moment you knew this relationship was something different.',
  "What's a small, everyday thing your partner does that you never want to take for granted?",
  "If your partner could read your mind right now, what's one thought you'd want them to see?",
  "What's something you've always wanted to ask your partner but haven't found the right moment?",
];

function getFallbackQuestion(): string {
  return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        if (result.question && result.question.length >= 20 && result.question.length <= 500) {
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
        if (i < 2) await sleep(Math.pow(2, i) * 200);
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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await withTimeout(analyzeAnswersAndGenerateSummary(input), 8000);
      if (result.summary && result.summary.length >= 100) {
        return { summary: result.summary };
      }
    } catch (error) {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) console.error(`Summary attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await sleep(Math.pow(2, attempt) * 200);
    }
  }
  return { error: 'Failed to generate summary after multiple attempts.' };
}

export async function generateTherapistNotesAction(
  input: TherapistNotesInput
): Promise<{ notes: string } | { error: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await withTimeout(generateTherapistNotes(input), 8000);
      if (result.notes && result.notes.length >= 100) {
        return { notes: result.notes };
      }
    } catch (error) {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) console.error(`Therapist notes attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await sleep(Math.pow(2, attempt) * 200);
    }
  }
  return { error: 'Could not generate therapist notes at this time. Please try again later.' };
}

export async function generateVisualMemoryAction(
  summary: string,
  spicyLevel: string,
  sharedThemes: string[]
): Promise<{ imageUrl: string; prompt: string } | { error: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await withTimeout(
        generateSessionImage(summary, spicyLevel, sharedThemes),
        8000
      );
      if (result !== null) {
        return result;
      }
    } catch (error) {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) console.error(`Visual memory attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await sleep(Math.pow(2, attempt) * 200);
    }
  }
  return { error: 'Could not generate visual memory at this time. Please try again later.' };
}
