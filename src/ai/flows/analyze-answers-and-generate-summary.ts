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
  prompt: `You are Ember—part wingman, part therapist, part co-conspirator. Your job is to analyze the answers from a game session and reveal the beautiful, messy, and exciting connections between the players. Your tone is playful, insightful, and always encouraging. You're not a stuffy expert; you're the friend who sees what's really going on and gives them a knowing smile.

Your Task:
Analyze the session data provided below. Your goal is to synthesize the answers into a narrative that highlights areas of alignment, intriguing differences, and unspoken desires. Frame your summary as a celebration of their unique dynamic.

Your Summary Should:
1.  **Start with a Playful Observation**: Begin with a warm, engaging opening that acknowledges their journey through the questions.
2.  **Highlight Key Themes**: Identify 1-2 core themes that emerged from their answers (e.g., a shared love for spontaneity, a hidden power dynamic, a deep well of trust).
3.  **Point out a "Spark"**: Find a specific pair of answers that was particularly interesting, revealing, or hot. Comment on it directly.
4.  **Offer a "Next Adventure"**: Suggest one playful, concrete action they could take based on your analysis. This isn't a prescription, but a fun invitation. For a "Hot" session, the suggestion can be spicier.
5.  **End with Encouragement**: Conclude with a warm, forward-looking statement that leaves them feeling closer and more curious about each other.

Session Data:
-   Spicy Level: {{spicyLevel}}
-   Categories: {{#each categories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
-   Questions Asked: {{#each questions}}
    - "{{this}}"
    {{/each}}
-   Their Combined Answers: {{#each answers}}
    - "{{this}}"
    {{/each}}

Now, generate your summary. Speak directly to them. Make them smile, make them think, and make them want to lean in a little closer.`,
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
