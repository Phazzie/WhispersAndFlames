'use server';

/**
 * @fileOverview Analyzes user answers from a session and generates a summary with personalized suggestions.
 *
 * - analyzeAnswersAndGenerateSummary - A function that analyzes answers and generates a summary.
 * - AnalyzeAnswersInput - The input type for the analyzeAnswersAndGenerateSummary function.
 * - AnalyzeAnswersOutput - The return type for the analyzeAnswersAndGenerateSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAnswersInputSchema = z.object({
  questions: z.array(z.string()).describe('The questions asked during the session.'),
  answers: z.array(z.string()).describe('The answers provided by all players during the session.'),
  categories: z.array(z.string()).describe('The categories selected for the session.'),
  spicyLevel: z.string().describe('The spicy level chosen for the session (Mild, Medium, Hot, Extra-Hot).'),
});

export type AnalyzeAnswersInput = z.infer<typeof AnalyzeAnswersInputSchema>;

const AnalyzeAnswersOutputSchema = z.object({
  summary: z.string().describe('A playful and encouraging summary of the session, highlighting similarities and differences, with personalized suggestions.'),
});

export type AnalyzeAnswersOutput = z.infer<typeof AnalyzeAnswersOutputSchema>;

export async function analyzeAnswersAndGenerateSummary(
  input: AnalyzeAnswersInput
): Promise<AnalyzeAnswersOutput> {
  return analyzeAnswersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeAnswersPrompt',
  input: {schema: AnalyzeAnswersInputSchema},
  output: {schema: AnalyzeAnswersOutputSchema},
  prompt: `You are a relationship expert who analyzes answers from a couples game to provide personalized suggestions.

  Analyze the following session data. Your goal is to identify similarities and differences in the players' answers.
  Based on this analysis, generate a playful and encouraging summary.
  Highlight areas of alignment and suggest ways to explore differences in a positive way.
  The tone should be positive, insightful, and supportive.

  Session Data:
  Questions: {{questions}}
  Answers: {{answers}}
  Categories: {{categories}}
  Spicy Level: {{spicyLevel}}

  Generate the summary:`,
});

const analyzeAnswersFlow = ai.defineFlow(
  {
    name: 'analyzeAnswersFlow',
    inputSchema: AnalyzeAnswersInputSchema,
    outputSchema: AnalyzeAnswersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
