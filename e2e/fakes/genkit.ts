/**
 * Stand-in for `@/ai/genkit` used by the e2e suite: every prompt answers with
 * canned, schema-valid output instead of calling xAI. The real prompts in
 * src/ai/flows are still imported and defined, so their wiring is exercised;
 * only the model call is replaced.
 */
let questionCounter = 0;

const SUMMARY =
  'E2E Scribe summary. You both kept circling back to the small, everyday moments that make you feel chosen, ' +
  'and neither of you was shy about naming what you want more of. That is a good sign.';
const NOTES =
  'Dr. Ember (e2e): Session notes. The couple shows a pattern of playful deflection followed by real candor. ' +
  'Recommended homework: one unhurried evening with phones in another room.';

function cannedOutput(name: string): Record<string, unknown> {
  switch (name) {
    case 'generateContextualQuestionsPrompt':
      questionCounter += 1;
      return {
        question: `E2E question ${questionCounter}: what is one small thing your partner does that you secretly love?`,
      };
    case 'scribeSummaryPrompt':
      return { summary: SUMMARY };
    case 'drEmberNotesPrompt':
      return { notes: NOTES };
    case 'visualMemoryPrompt':
      return {
        imagePrompt:
          'Abstract oil painting of two flames leaning together, warm amber and crimson, soft candlelight',
        safetyLevel: 'safe',
      };
    default:
      throw new Error(`e2e genkit fake: no canned output for prompt "${name}"`);
  }
}

export const ai = {
  definePrompt(config: { name: string }) {
    return async () => ({ output: cannedOutput(config.name) });
  },
  defineFlow<I, O>(_config: unknown, fn: (input: I) => Promise<O>) {
    return fn;
  },
};
