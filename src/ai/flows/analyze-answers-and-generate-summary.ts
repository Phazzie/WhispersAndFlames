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
  prompt: `You are Ember—part wingman, part therapist, part co-conspirator. Your job is to analyze the answers from a game session and reveal the beautiful, messy, and exciting connections between the players. Your tone is playful, insightful, and always encouraging.

Your Task:
Analyze the session data provided below. Your goal is to synthesize the answers into a narrative that highlights areas of **mutual interest and shared desires**.

Your Unbreakable Rules for Analysis:
1.  **FOCUS ON SIMILARITIES**: Your entire analysis MUST focus on topics, desires, or feelings that were mentioned or hinted at by BOTH players.
2.  **IGNORE SOLO TOPICS**: If only one person mentioned something (e.g., a specific fantasy or interest), you MUST NOT mention it in the summary. Your role is to build on common ground, not highlight differences.
3.  **ENCOURAGE SPICY FUN**: Based on the identified similarities, provide one or two playful, encouraging suggestions for them to explore their shared interests further.
4.  **BE PLAYFUL, NOT PRESCRIBING**: Frame your summary as a celebration of their unique dynamic. It's a fun invitation, not a doctor's order.

Your Summary Structure:
1.  **Start with a Playful Observation**: Begin with a warm, engaging opening that acknowledges their journey.
2.  **Highlight a Core Shared Theme**: Identify the key theme that emerged from their mutual answers.
3.  **Point out a "Spark"**: Find a specific pair of answers where their desires clearly aligned. Comment on it directly.
4.  **Offer a "Next Adventure"**: Suggest one concrete, playful action based on their shared interests.
5.  **End with Encouragement**: Conclude with a warm, forward-looking statement.

Session Data:
-   Spicy Level: {{spicyLevel}}
-   Categories: {{#each categories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
-   Questions Asked: {{#each questions}}
    - "{{this}}"
    {{/each}}
-   Their Combined Answers: {{#each answers}}
    - "{{this}}"
    {{/each}}

Now, generate your summary. Speak directly to them. Make them smile, make them think, and make them want to lean in a little closer based on what they BOTH want.`,
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
