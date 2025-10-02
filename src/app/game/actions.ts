
'use server';

import { generateContextualQuestions, GenerateContextualQuestionsInput } from '@/ai/flows/generate-contextual-questions';
import { analyzeAnswersAndGenerateSummary, AnalyzeAnswersInput } from '@/ai/flows/analyze-answers-and-generate-summary';

function getFallbackQuestion(): string {
    // This provides a simple, generic fallback that is unlikely to have been asked.
    return "What's one secret you've never told your partner about something you find attractive in them?";
}


export async function generateQuestionAction(input: GenerateContextualQuestionsInput): Promise<{ question: string } | { error: string }> {
  try {
    // Add a 3-time retry mechanism with a circuit breaker for the AI call
    for (let i = 0; i < 3; i++) {
        try {
            const result = await generateContextualQuestions(input);
            if (result.question) {
                return { question: result.question };
            }
        } catch (error) {
            console.error(`AI question generation attempt ${i + 1} failed:`, error);
            if (i === 2) { // Last attempt failed
                throw new Error("AI service is currently unavailable after multiple attempts.");
            }
        }
    }
    // This part should be unreachable, but as a safeguard:
    return { question: getFallbackQuestion() };

  } catch (error) {
    console.error('AI question generation failed permanently. Using fallback.', error);
    const fallbackQuestion = getFallbackQuestion();
    return { question: fallbackQuestion };
  }
}

export async function analyzeAndSummarizeAction(input: AnalyzeAnswersInput): Promise<{ summary: string } | { error: string }> {
  try {
    const result = await analyzeAnswersAndGenerateSummary(input);
    return { summary: result.summary };
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return { error: 'Could not generate a summary at this time. Please try again later.' };
  }
}
