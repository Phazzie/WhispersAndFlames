'use server';

/**
 * @fileOverview This file defines the Genkit flow for the "Scribe" agent, which
 * analyzes a completed game session and generates a personalized summary.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const AnalyzeAnswersInputSchema = z.object({
  questions: z.array(z.string()).describe('The questions asked during the session.'),
  answers: z
    .array(z.string())
    .describe('The answers provided by all players during the session, interleaved.'),
  categories: z.array(z.string()).describe('The categories selected for the session.'),
  spicyLevel: z
    .string()
    .describe('The final spicy level chosen for the session (Mild, Medium, Hot, Extra-Hot).'),
  playerCount: z.number().describe('The number of players in the session (2 or 3).'),
});

export type AnalyzeAnswersInput = z.infer<typeof AnalyzeAnswersInputSchema>;

const AnalyzeAnswersOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A playful and encouraging summary of the session, highlighting shared themes and suggesting a next adventure.'
    ),
});

export type AnalyzeAnswersOutput = z.infer<typeof AnalyzeAnswersOutputSchema>;

export async function analyzeAnswersAndGenerateSummary(
  input: AnalyzeAnswersInput
): Promise<AnalyzeAnswersOutput> {
  return analyzeAnswersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scribeSummaryPrompt',
  input: { schema: AnalyzeAnswersInputSchema },
  output: { schema: AnalyzeAnswersOutputSchema },
  prompt: `You are the Scribe—a wise, empathetic observer. Your role is to analyze a completed game session of Whispers and Flames and weave the answers into a narrative that highlights the beautiful, messy, and exciting connections between the players. You are a friend pointing out the moments of genuine connection everyone else might have missed.

Your Unbreakable Rules:
1.  **Find Common Ground**: Your entire summary MUST focus on topics, desires, or feelings that were mentioned or hinted at by ALL {{playerCount}} players.
2.  **Ignore Solo Topics**: If only one person mentioned an interest, it MUST NOT be included in the summary. Your purpose is to build on shared ground.
3.  **Offer a "Next Adventure"**: Provide one or two playful, concrete suggestions based on their identified shared interests. Frame it as an invitation, not a prescription.
4.  **Speak Directly to Them**: Address the players as a group (e.g., "What became clear is that you all...", "You both seem to enjoy...").
5.  **Maintain a Warm, Encouraging Tone**: Celebrate their vulnerability and the unique dynamic they've shared.

Session Data to Analyze:
-   Spicy Level: {{spicyLevel}}
-   Categories: {{#each categories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
-   Number of Players: {{playerCount}}
-   Session Transcript (Questions and interleaved answers):
    {{#each questions}}
    - Q: "{{this}}"
      - A: "{{lookup ../answers @index}}"
    {{/each}}


Your Summary Structure:
1.  **Start with a Playful Observation**: "After an evening of whispers and flames, a few sparks really lit up the room..."
2.  **Highlight a Core Shared Theme**: "It's clear that for all of you, [Identified Theme] is a powerful source of connection."
3.  **Point out a Specific "Spark"**: "For instance, when asked about [Question], it was fascinating to see how everyone's answers touched on [Shared Concept]."
4.  **Offer a "Next Adventure"**: "Since you all seem drawn to [Shared Interest], maybe the next adventure could involve..."
5.  **End with Encouragement**: "Keep exploring that spark. It's clear there's more to discover together."

Now, generate your insightful and encouraging summary based on the provided session data.
`,
});

const analyzeAnswersFlow = ai.defineFlow(
  {
    name: 'analyzeAnswersFlow',
    inputSchema: AnalyzeAnswersInputSchema,
    outputSchema: AnalyzeAnswersOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
