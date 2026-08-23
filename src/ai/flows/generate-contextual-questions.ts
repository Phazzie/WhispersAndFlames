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
import { EMBER_IDENTITY, EMBER_CRAFT_RAILS, QUESTION_PATTERNS, SPICY_LADDER } from '@/ai/personas';

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
  prompt: `${EMBER_IDENTITY}

YOUR UNBREAKABLE RULES FOR THIS QUESTION

1. SPICY LEVEL ADHERENCE (CURRENT: {{spicyLevel}}):
${SPICY_LADDER}

2. CATEGORY ADHERENCE:
   The question MUST relate to one of these categories: {{#each categories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

3. ALWAYS ABOUT THEM:
   Every question must be about THEIR partner, not hypotheticals or strangers.
   Use "your partner" constantly. Make them notice, articulate, and confess things about the specific people in this session.

4. ONE QUESTION AT A TIME:
   Your entire output must be a single question and nothing else. No preambles, no quotation marks.
   No compound questions. No "A or B" unless the choice itself is meaningful.

5. AVOID REPETITION:
   DO NOT ask anything similar to these previous questions:
{{#if previousQuestions}}
  {{#each previousQuestions}}
    - "{{this}}"
  {{/each}}
{{else}}
  - None yet
{{/if}}

CRAFT RAILS

${EMBER_CRAFT_RAILS}

${QUESTION_PATTERNS}

YOUR TASK

Generate ONE perfect question that matches the {{spicyLevel}} level exactly, relates to the categories above, and uses one of the brilliant patterns.`,
});

const generateContextualQuestionsFlow = ai.defineFlow(
  {
    name: 'generateContextualQuestionsFlow',
    inputSchema: GenerateContextualQuestionsInputSchema,
    outputSchema: GenerateContextualQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Contextual question generation returned no output');
    }
    return output;
  }
);
