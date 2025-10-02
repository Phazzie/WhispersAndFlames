
'use server';

import { generateContextualQuestions, GenerateContextualQuestionsInput } from '@/ai/flows/generate-contextual-questions';
import { analyzeAnswersAndGenerateSummary, AnalyzeAnswersInput } from '@/ai/flows/analyze-answers-and-generate-summary';

function getFallbackQuestion(spicyLevel: GenerateContextualQuestionsInput['spicyLevel'], previousQuestions: string[]): string {
    // This provides a simple, generic fallback that is unlikely to have been asked.
    return "What's one secret you've never told your partner about something you find attractive in them?";
}


export async function generateQuestionAction(input: GenerateContextualQuestionsInput): Promise<{ question: string } | { error: string }> {
  try {
    const result = await generateContextualQuestions(input);
    if (!result.question) {
      throw new Error('AI returned an empty question.');
    }
    return { question: result.question };
  } catch (error) {
    console.error('AI question generation failed:', error);
    // Use the fallback mechanism
    const fallbackQuestion = getFallbackQuestion(input.spicyLevel, input.previousQuestions || []);
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
