'use server';

import { generateContextualQuestions, GenerateContextualQuestionsInput } from '@/ai/flows/generate-contextual-questions';
import { analyzeAnswersAndGenerateSummary, AnalyzeAnswersInput } from '@/ai/flows/analyze-answers-and-generate-summary';

export async function generateQuestionAction(input: GenerateContextualQuestionsInput): Promise<{ question: string } | { error: string }> {
  try {
    const result = await generateContextualQuestions(input);
    return { question: result.question };
  } catch (error) {
    console.error('AI question generation failed:', error);
    // In a real app, you might trigger a circuit breaker here.
    // For now, we return a fallback question.
    return {
      question: "What's one secret you've never told your partner about something you find attractive in them?",
    };
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
