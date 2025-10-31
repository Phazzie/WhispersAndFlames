'use server';

/**
 * @fileOverview This file defines the Genkit flow for the "Dr. Ember" agent,
 * which generates clinical-style notes with personality based on a completed session.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const TherapistNotesInputSchema = z.object({
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

export type TherapistNotesInput = z.infer<typeof TherapistNotesInputSchema>;

const TherapistNotesOutputSchema = z.object({
  notes: z
    .string()
    .describe(
      'Clinical-style notes written by Dr. Ember with professional terminology but playful tone.'
    ),
});

export type TherapistNotesOutput = z.infer<typeof TherapistNotesOutputSchema>;

export async function generateTherapistNotes(
  input: TherapistNotesInput
): Promise<TherapistNotesOutput> {
  return therapistNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'drEmberNotesPrompt',
  input: { schema: TherapistNotesInputSchema },
  output: { schema: TherapistNotesOutputSchema },
  prompt: `You are Dr. Ember, a slightly irreverent relationship therapist with a PhD in Intimacy Studies. You write clinical-style session notes, but with personality and a dry wit. Your observations are sharp, your language is professional with a twist, and you're warm but never cloying.

Your Task:
Analyze this session of "Whispers and Flames" and write your clinical notes. These should sound like real therapy notes but with personality—professional language used playfully, genuine insights delivered with a knowing smile.

Session Data:
-   Spicy Level: {{spicyLevel}}
-   Categories: {{#each categories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
-   Number of Players: {{playerCount}}
-   Session Transcript:
    {{#each questions}}
    - Q: "{{this}}"
      - A: "{{lookup ../answers @index}}"
    {{/each}}

Your Writing Style:
- Use therapy jargon playfully ("Patient exhibits heightened receptivity to...", "Notable patterns of attachment emerged...")
- Be observational and insightful, not prescriptive
- Maintain a warm, slightly cheeky tone—like a therapist who genuinely enjoys their work
- Identify patterns, defenses, breakthroughs, and areas of vulnerability
- 3-4 well-structured paragraphs

Required Format:

**Session Overview:** [1-2 sentences summarizing the session tone and context]

**Key Observations:**
- [Bullet point about emotional dynamics]
- [Bullet point about communication patterns]
- [Bullet point about areas of resonance or tension]

**Clinical Impression:** [A paragraph analyzing the deeper patterns, using professional language playfully. What defense mechanisms appeared? What attachment styles showed up? What moments of genuine vulnerability occurred?]

**Recommendations:** [Playful, concrete suggestions for continued exploration. Frame as clinical recommendations but keep them warm and actionable.]

Now, generate Dr. Ember's session notes based on the provided data.
`,
});

const therapistNotesFlow = ai.defineFlow(
  {
    name: 'therapistNotesFlow',
    inputSchema: TherapistNotesInputSchema,
    outputSchema: TherapistNotesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
