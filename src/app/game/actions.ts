'use server';

import { generateContextualQuestions, GenerateContextualQuestionsInput } from '@/ai/flows/generate-contextual-questions';
import { analyzeAnswersAndGenerateSummary, AnalyzeAnswersInput } from '@/ai/flows/analyze-answers-and-generate-summary';

// Example fallback questions from aiprompting.md
const FALLBACK_QUESTIONS = {
  Mild: [
    "What's one completely non-sexual thing your partner does that somehow makes you think sexual thoughts?",
    "Describe a specific moment in the last week when you looked at your partner and thought 'damn' but didn't say anything.",
    "What's an ordinary item of clothing your partner wears that you secretly wish you could remove?",
  ],
  Medium: [
    "What's one specific thing you want to do to your partner's neck? Be detailed.",
    "Describe exactly where you'd want your partner's hands during a kiss. Not just 'on me'—WHERE?",
    "What sound do you wish your partner made more of?",
  ],
  Hot: [
    "What's one filthy thing you've imagined doing to your partner but worried was too much?",
    "If your partner said 'Use me however you want for the next hour,' what's the first thing you'd do?",
    "What's one place (public or semi-public) where you've fantasized about being with your partner?",
  ],
  'Extra-Hot': [
    "What's one rule you'd give your partner that they have to follow for the next hour?",
    "If you could mark your partner as yours in one specific way, what would you do and where?",
    "What's the filthiest thing you'd want to whisper to your partner while you're in the middle of something intimate?",
  ],
};

function getFallbackQuestion(spicyLevel: GenerateContextualQuestionsInput['spicyLevel'], previousQuestions: string[]): string {
    const options = FALLBACK_QUESTIONS[spicyLevel];
    const available = options.filter(q => !previousQuestions.includes(q));
    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    // If all fallbacks for this level have been used, return a generic one
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
