/**
 * AI Mock Service
 * Production-quality mock implementation of IAIService
 * Uses realistic question banks from AIGUIDA examples
 */

import type {
  IAIService,
  QuestionInput,
  QuestionOutput,
  SummaryInput,
  SummaryOutput,
  TherapistNotesInput,
  TherapistNotesOutput,
  VisualMemoryInput,
} from '@/contracts/AI';
import type { VisualMemorySeam } from '@/contracts/Game';

// Utility function for realistic network delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AIMockService implements IAIService {
  // Question banks organized by spicy level (from AIGUIDA examples)
  private questionBankCouples: Record<string, string[]> = {
    Mild: [
      "What's one completely non-sexual thing your partner does that somehow makes you think sexual thoughts?",
      "Describe a specific moment in the last week when you looked at your partner and thought 'damn' but didn't say anything.",
      "What's an ordinary item of clothing your partner wears that you secretly wish you could remove?",
      "What's one word your partner says, or way they say something, that does more for you than they realize?",
      "If you could re-live one kiss with your partner, which one and why that one specifically?",
      "What's one room in your home where you've never fooled around but probably should?",
      "Exactly where on your partner's body do your eyes go first when they walk into a room?",
      "What's the exact tone of voice your partner uses that makes you pay attention?",
    ],
    Medium: [
      "What's one specific thing you want to do to your partner's neck? Be detailed.",
      "Describe exactly where you'd want your partner's hands during a kiss. Not just 'on me'—WHERE?",
      "What's one item you'd want to see your partner wear for exactly ten seconds before you removed it?",
      "What's one instruction you'd love to give your partner that starts with 'Don't move while I...'?",
      "If you blindfolded your partner, what's the first thing you'd want them to feel?",
      "What sound do you wish your partner made more of?",
      "Would you rather your partner tell you exactly what to do, or beg you to keep doing what you're doing?",
      "Think of one specific moment in the last month when you wanted your partner but didn't say anything. What were they doing?",
    ],
    Hot: [
      "What's one filthy thing you've imagined doing to your partner but worried was too much?",
      "Complete this: 'I want to [blank] you until you [blank].'",
      "What's one thing you want your partner to be a little rough with?",
      "If your partner said 'Use me however you want for the next hour,' what's the first thing you'd do?",
      "What's one place (public or semi-public) where you've fantasized about being with your partner?",
      "Would you rather dominate your partner completely for one night, or surrender completely to them?",
      "What's the most turned on you've ever been by your partner, and what were they doing that made you feel that way?",
      "If you could only use your mouth to drive your partner crazy, where would you start?",
    ],
    'Extra-Hot': [
      "What's one rule you'd give your partner that they have to follow for the next hour?",
      "Fill in: 'I want to [blank] you while you [blank], until you beg me to [blank].'",
      "What's the filthiest thing you'd want to whisper to your partner while you're [doing something specific]?",
      "If you could mark your partner as yours in one specific way, what would you do and where?",
      "What's something your partner could wake you up doing that would be the best alarm clock ever?",
      "Complete this: 'The hottest thing would be if you [blank] while I [blank].'",
    ],
  };

  private questionBankTrios: Record<string, string[]> = {
    Mild: [
      "Which of your partners has a feature—voice, hands, eyes, laugh—that you find unexpectedly hot?",
      "Think of a time when you watched your two partners interact and found yourself attracted to the dynamic itself. What were they doing?",
      "Picture this: one partner is kissing your neck, the other your wrist. Who's where, and why?",
    ],
    Medium: [
      "If both partners wanted your attention at once, one kissing you and one undressing you, who gets which job and why?",
      "Which partner do you want watching you with the other partner, and what do you want them to see?",
      "What's one thing you'd want both partners doing to you simultaneously? Be specific about what and where.",
    ],
    Hot: [
      "If you were directing your two partners like a movie scene, what would the opening shot be?",
      "Which partner would you want whispering filthy things in your ear while the other acts them out?",
      "Complete this: 'I want [Partner A] to hold me down while [Partner B]...'",
      "If you had to watch your two partners together before joining, what would you want to see them doing?",
    ],
    'Extra-Hot': [
      "If you could create a rule for all three of you (like 'no hands allowed' or 'everyone keeps going until everyone says so'), what's the rule?",
      "Which partner would you want giving you instructions while you're with the other partner?",
      "Complete this: 'The perfect scenario would be me [blank] while [Partner A] [blank] and [Partner B] watches and [blank].'",
    ],
  };

  async generateQuestion(input: QuestionInput): Promise<QuestionOutput> {
    // Simulate AI processing delay (300-500ms)
    await delay(300 + Math.random() * 200);

    // Validate input
    if (!input.spicyLevel) {
      throw new Error('Spicy level is required');
    }

    // Select appropriate question bank
    const questionBank =
      input.playerCount >= 3 ? this.questionBankTrios : this.questionBankCouples;

    // Get questions for this spicy level
    const questions = questionBank[input.spicyLevel] || [];

    // Filter out previously asked questions
    const availableQuestions = questions.filter(
      (q) => !input.previousQuestions.includes(q)
    );

    // If no questions available, return fallback
    if (availableQuestions.length === 0) {
      return {
        question: "What's one thing you've been wanting to tell your partner?",
      };
    }

    // Return random question
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return {
      question: availableQuestions[randomIndex],
    };
  }

  async generateSummary(input: SummaryInput): Promise<SummaryOutput> {
    // Simulate AI processing delay (500-700ms)
    await delay(500 + Math.random() * 200);

    // Generate realistic summary based on inputs
    const categoryText =
      input.categories.length > 1
        ? input.categories.slice(0, -1).join(', ') + ' and ' + input.categories.slice(-1)
        : input.categories[0];

    const playerText = input.playerCount === 2 ? 'both of you' : 'all three of you';

    const summary = `After exploring ${categoryText}, a few themes became impossible to ignore. What stood out was how ${playerText} circled around the idea of anticipation—the buildup, the tension, the art of the slow reveal. When asked about specific moments, it was clear you find power in the pause, in the almost-but-not-quite.

The chemistry here isn't just in what you do—it's in what you notice about each other. The small details, the specific looks, the exact moments when desire kicks in. That's the language you're speaking together.

Since ${playerText} seem drawn to that anticipatory energy, maybe the next adventure involves leaning into that tension. Try drawing out a moment longer than feels comfortable. See what happens when you make each other wait.

Keep exploring that spark. It's clear there's more to discover together.`;

    return { summary };
  }

  async generateTherapistNotes(input: TherapistNotesInput): Promise<TherapistNotesOutput> {
    // Simulate AI processing delay (450-650ms)
    await delay(450 + Math.random() * 200);

    const playerText = input.playerCount === 2 ? 'dyad' : 'triad';
    const patientCount = input.playerCount === 2 ? 'Both patients' : 'All three patients';

    const notes = `**Session Overview:** Patients engaged in ${input.spicyLevel}-level intimacy exploration focusing on ${input.categories[0]}. Notable energy and mutual engagement throughout.

**Key Observations:**
- ${patientCount} demonstrated heightened receptivity to anticipatory scenarios, suggesting shared appetite for tension-building dynamics
- Communication patterns revealed complementary vulnerability styles: some lead with specificity, others with emotional context
- Strong resonance emerged around themes of control and surrender, with participants expressing interest from different positions

**Clinical Impression:** This ${playerText} exhibits healthy attachment with adventurous undertones. Patients showed willingness to articulate desires without defensive posturing—a positive indicator for continued intimacy development. The complementary nature of their expressed interests suggests natural dynamic compatibility. Minimal resistance to vulnerability prompts indicates secure base from which to explore.

**Recommendations:** Continue exploration of anticipatory tension as primary arousal mechanism. Recommend experimenting with extended scenarios where timing and pacing become focal points. Also recommend keeping a straight face while trying. Follow-up session in 2-4 weeks to assess integration of insights.`;

    return { notes };
  }

  async generateVisualMemory(input: VisualMemoryInput): Promise<VisualMemorySeam> {
    // Simulate AI processing delay (400-600ms)
    await delay(400 + Math.random() * 200);

    // Abstract art prompts matched to spicy level (never explicit)
    const prompts: Record<string, string> = {
      Mild: 'Watercolor painting of two light trails intertwining in soft pastels, gentle curves flowing together against a dreamy gradient background, romantic and tender, soft focus, impressionist style',
      Medium:
        'Impressionist oil painting of two flames dancing together, warm oranges bleeding into deep reds, soft edges and rich texture, building heat and sensual energy',
      Hot: 'Contemporary art piece depicting fire and silk in dramatic tension, bold reds against deep blacks, stark lighting creating powerful contrasts, passionate energy and movement',
      'Extra-Hot':
        'Abstract expressionist painting with intense reds and blacks colliding, raw brushstrokes creating visceral energy, primal passion depicted through bold movement and color, untamed power',
    };

    const imagePrompt = prompts[input.spicyLevel] || prompts['Mild'];

    // Safety level: never explicit
    const safetyLevel = input.spicyLevel === 'Mild' ? 'safe' : 'moderate';

    return {
      imagePrompt,
      safetyLevel,
    };
  }
}
