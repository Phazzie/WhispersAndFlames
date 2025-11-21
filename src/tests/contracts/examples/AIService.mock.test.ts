/**
 * Example: Running AIService contract tests against mock AI implementation
 *
 * This demonstrates how to create and test a mock AI service.
 */

import { describe } from 'vitest';
import { runAIServiceContractTests, type AIService, type QuestionInput, type QuestionOutput, type SummaryInput, type SummaryOutput, type TherapistNotesInput, type TherapistNotesOutput, type VisualMemoryInput, type VisualMemoryOutput } from '../AIService.contract.test';

/**
 * Mock AI Service Implementation
 * This provides pre-defined responses for testing
 */
class MockAIService implements AIService {
  private questionBank: Record<string, string[]> = {
    'Mild': [
      "What's one completely non-sexual thing your partner does that somehow makes you think sexual thoughts?",
      "Describe a specific moment this week when you looked at your partner and thought 'damn' but didn't say anything.",
      "What's an ordinary item of clothing your partner wears that you secretly wish you could remove?",
    ],
    'Medium': [
      "What's one specific thing you want to do to your partner's neck? Be detailed.",
      "Describe exactly where you'd want your partner's hands during a kiss. Not just 'on me'—WHERE?",
      "If you blindfolded your partner, what's the first thing you'd want them to feel?",
    ],
    'Hot': [
      "What's one filthy thing you've imagined doing to your partner but worried was too much?",
      "Complete this: 'I want to [blank] you until you [blank].'",
      "What's the most turned on you've ever been by your partner, and what were they doing?",
    ],
    'Extra-Hot': [
      "What's one rule you'd give your partner that they have to follow for the next hour?",
      "Fill in: 'I want to [blank] you while you [blank], until you beg me to [blank].'",
      "If you could mark your partner as yours in one specific way, what would you do and where?",
    ],
  };

  async generateQuestion(input: QuestionInput): Promise<QuestionOutput> {
    // Simulate network delay
    await this.delay(100);

    const questions = this.questionBank[input.spicyLevel] || this.questionBank['Mild'];
    const availableQuestions = questions.filter(
      (q) => !input.previousQuestions.includes(q)
    );

    if (availableQuestions.length === 0) {
      return { question: "What's one thing you've been wanting to tell your partner?" };
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return { question: availableQuestions[randomIndex] };
  }

  async generateSummary(input: SummaryInput): Promise<SummaryOutput> {
    await this.delay(150);

    const summary = `After exploring ${input.categories.join(' and ')}, a few themes became clear. Both of you expressed interest in ${this.extractTheme(input.answers)}. The ${input.spicyLevel} level conversation revealed a shared appetite for exploring new dimensions of your connection. Consider leaning into that energy—the vulnerability you showed today is where real intimacy lives.`;

    return { summary };
  }

  async generateTherapistNotes(input: TherapistNotesInput): Promise<TherapistNotesOutput> {
    await this.delay(150);

    const notes = `**Session Overview:** Patients engaged in ${input.spicyLevel}-level intimacy exploration focusing on ${input.categories[0]}. Notable energy and mutual engagement throughout.

**Key Observations:**
- Both patients demonstrated willingness to explore ${this.extractTheme(input.answers)}
- Communication patterns revealed complementary vulnerability styles
- Strong resonance emerged around themes of connection and desire

**Clinical Impression:** This dyad exhibits healthy attachment with adventurous undertones. Both patients showed willingness to articulate desires without defensive posturing—a positive indicator for continued intimacy development.

**Recommendations:** Continue exploration with emphasis on communication and mutual vulnerability. Follow-up session in 2-4 weeks to assess integration of insights.`;

    return { notes };
  }

  async generateVisualMemory(input: VisualMemoryInput): Promise<VisualMemoryOutput> {
    await this.delay(120);

    const prompts: Record<string, string> = {
      'Mild':
        'Watercolor painting of two light trails intertwining in soft pastels, gentle curves flowing together against a dreamy gradient background, romantic and tender, soft focus, impressionist style',
      'Medium':
        'Impressionist oil painting of two flames dancing together, warm oranges bleeding into deep reds, soft edges and rich texture, building heat and sensual energy',
      'Hot':
        'Contemporary art piece depicting fire and silk in dramatic tension, bold reds against deep blacks, stark lighting creating powerful contrasts, passionate energy and movement',
      'Extra-Hot':
        'Abstract expressionist painting with intense reds and blacks colliding, raw brushstrokes creating visceral energy, primal passion depicted through bold movement and color, untamed power',
    };

    return {
      prompt: prompts[input.spicyLevel] || prompts['Mild'],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractTheme(answers: string[]): string {
    const commonWords = ['connection', 'trust', 'vulnerability', 'desire', 'intimacy'];
    const lowerAnswers = answers.join(' ').toLowerCase();

    for (const word of commonWords) {
      if (lowerAnswers.includes(word)) {
        return word;
      }
    }

    return 'deeper understanding';
  }
}

describe('AIService Contract - Mock AI Implementation', () => {
  const mockService = new MockAIService();

  // Run all contract tests against the mock implementation
  runAIServiceContractTests(mockService);

  // You can add mock-specific tests here if needed
  describe('Mock AI Specific Tests', () => {
    // Example: Test that mock uses pre-defined question banks
    // Example: Test that mock simulates appropriate delays
  });
});
