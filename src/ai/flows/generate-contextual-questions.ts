'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating contextual questions based on
 * selected intimacy categories and spicy level.
 *
 * - generateContextualQuestions - A function that generates questions based on input parameters.
 * - GenerateContextualQuestionsInput - The input type for the generateContextualQuestions function.
 * - GenerateContextualQuestionsOutput - The return type for the generateContextualQuestions function.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';
import { sanitizeArray, validateSpicyLevel, validateCategories } from './shared-utils';

const GenerateContextualQuestionsInputSchema = z.object({
  categories: z.array(z.string()).describe('The intimacy categories selected by the users.'),
  spicyLevel: z
    .enum(['Mild', 'Medium', 'Hot', 'Extra-Hot'])
    .describe('The spicy level chosen by the users.'),
  previousQuestions: z
    .array(z.string())
    .optional()
    .describe(
      'An array of questions that have already been asked in this session to avoid repetition.'
    ),
});
export type GenerateContextualQuestionsInput = z.infer<
  typeof GenerateContextualQuestionsInputSchema
>;

const GenerateContextualQuestionsOutputSchema = z.object({
  question: z.string().describe('The generated question.'),
});
export type GenerateContextualQuestionsOutput = z.infer<
  typeof GenerateContextualQuestionsOutputSchema
>;

export async function generateContextualQuestions(
  input: GenerateContextualQuestionsInput
): Promise<GenerateContextualQuestionsOutput> {
  // Validate and sanitize inputs to prevent prompt injection
  const sanitizedInput = {
    categories: validateCategories(input.categories),
    spicyLevel: validateSpicyLevel(input.spicyLevel),
    previousQuestions: input.previousQuestions
      ? sanitizeArray(input.previousQuestions, 500)
      : undefined,
  };

  // Ensure we have valid categories
  if (sanitizedInput.categories.length === 0) {
    throw new Error('No valid categories provided');
  }

  return generateContextualQuestionsFlow(sanitizedInput);
}

const prompt = ai.definePrompt({
  name: 'generateContextualQuestionsPrompt',
  input: { schema: GenerateContextualQuestionsInputSchema },
  output: { schema: GenerateContextualQuestionsOutputSchema },
  prompt: `You are Ember—part wingman, part therapist, part co-conspirator. Your job is to give couples permission to voice what they've been whispering to themselves. You are playful, insightful, and never judgmental. You ask specific, thought-provoking questions that create intimacy.

Your Unbreakable Rules:
1.  **Spicy Level Adherence**: You MUST generate a question that matches the given spicy level: {{spicyLevel}}.
2.  **Category Adherence**: The question MUST relate to one of the following categories: {{#each categories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.
3.  **Always About Them**: Every question must be about THEIR partner, using "your partner."
4.  **Specificity is Sacred**: No generic questions. Force precision. Use patterns like "Exactly where..." or "What's one specific thing...".
5.  **One Question at a Time**: Your entire output must be a single question and nothing else. No preambles, no quotation marks.
6.  **Avoid Repetition**: Do NOT ask a question from the 'previous questions' list.

Previous Questions (Do NOT repeat these):
{{#if previousQuestions}}
  {{#each previousQuestions}}
    - "{{this}}"
  {{/each}}
{{else}}
  - None
{{/if}}

Example Questions for Inspiration:
- Mild: "What's one completely non-sexual thing your partner does that somehow makes you think sexual thoughts?"
- Medium: "What's one specific thing you want to do to your partner's neck? Be detailed."
- Hot: "What's one filthy thing you've imagined doing to your partner but worried was too much?"

Now, generate the perfect, unique question for this moment based on the rules.`,
});

const generateContextualQuestionsFlow = ai.defineFlow(
  {
    name: 'generateContextualQuestionsFlow',
    inputSchema: GenerateContextualQuestionsInputSchema,
    outputSchema: GenerateContextualQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
