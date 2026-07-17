import type {
  CategoryId,
  IntensityId,
  MatchCandidateView,
} from "@/lib/game/contracts";
import type { GameQuestionContent } from "@/lib/game/ports";

type EightQuestions = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const QUESTION_BANK = {
  connection: {
    mild: [
      "What exact moment recently made you feel most in sync with your partner?",
      "What is one specific habit your partner has that makes you feel quietly cared for?",
      "What is one small way you wish your partner would invite you closer after a long day?",
      "What exact words from your partner would make you feel especially understood this week?",
      "What is one feeling you find easier to share when your partner gives you their full attention?",
      "What quiet truth about feeling close to your partner have you been meaning to say aloud?",
      "What one tiny ritual would you like to plan with your partner for the end of the day?",
      "What specific invitation could you offer your partner for one uninterrupted hour together?",
    ],
    medium: [
      "What exact look from your partner makes an ordinary moment suddenly feel intimate?",
      "What is one specific way your partner closes the distance between you that always lands?",
      "Where would you want your partner to pull you closer when you need reassurance without words?",
      "What tone of voice from your partner makes you want to stay close a little longer?",
      "What is one intimate need you would trust your partner to meet if you named it clearly?",
      "What specific kind of closeness with your partner do you crave more often than you admit?",
      "What private ritual would you like to plan with your partner to make anticipation part of the day?",
      "What exact first move could your partner make on a planned night devoted only to reconnecting?",
    ],
    hot: [
      "What exact moment in your partner's presence makes your self-control feel delightfully fragile?",
      "What is one specific signal from your partner that tells you they want the same heat you do?",
      "Where would you want your partner to draw you closer when mutual desire is already unmistakable?",
      "What exact phrase from your partner would make a consensual intimate moment feel even hotter?",
      "What is one intense desire you want your partner to understand without judging you?",
      "What specific kind of surrender or control would you feel safe exploring with your partner?",
      "What boundary-setting conversation would help you and your partner plan a hotter night with confidence?",
      "What exact invitation would you like your partner to make when you are both ready to turn up the heat?",
    ],
  },
  attraction: {
    mild: [
      "Exactly where do your eyes go first when your partner walks into a room?",
      "What is one completely ordinary thing your partner does that you find unfairly attractive?",
      "What specific outfit would you love to see your partner choose for a date with you?",
      "What small change in your partner's voice makes you want to lean closer?",
      "What is one compliment about your partner's appeal that you have thought but not said?",
      "What specific memory of your partner still gives you that first-date flutter?",
      "What kind of setting would you plan to make your partner feel especially admired?",
      "What exact compliment would you like to whisper to your partner the next time the timing feels perfect?",
    ],
    medium: [
      "Exactly which detail about your partner catches your attention before you can play it cool?",
      "What is one specific movement your partner makes that instantly changes the temperature for you?",
      "Where would you want your partner's hands during a slow kiss?",
      "What sensory detail about your partner would you want to notice with your eyes closed?",
      "What is one attraction to your partner that feels deliciously vulnerable to admit?",
      "What exact memory of wanting your partner have you kept mostly to yourself?",
      "What would you plan for your partner to wear just long enough to build anticipation?",
      "What specific first touch would you invite from your partner on a night designed around attraction?",
    ],
    hot: [
      "Exactly what about your partner makes desire hit you before you have time to edit it?",
      "What is one specific part of your partner you have trouble admiring politely?",
      "Where would you want your partner's attention to linger when you are both clearly asking for more?",
      "What exact sound from your partner would make an intimate moment impossible to forget?",
      "What is one explicit desire involving your partner that you would feel excited to name?",
      "What specific thing about wanting your partner feels boldest to confess tonight?",
      "What sensual scene would you plan to let your partner know exactly how attractive you find them?",
      "What first move would you want your partner to make once you have both agreed the waiting is over?",
    ],
  },
  playfulness: {
    mild: [
      "What is one ridiculous little thing your partner does that never fails to charm you?",
      "What exact kind of teasing from your partner makes you grin instead of roll your eyes?",
      "What playful challenge would you secretly love your partner to give you on a date?",
      "What harmless surprise from your partner would make an ordinary evening feel mischievous?",
      "What is one goofy side of yourself you wish your partner invited out more often?",
      "What playful compliment have you wanted to give your partner but held back?",
      "What tiny two-person game would you plan with your partner to make the week more flirtatious?",
      "What exact playful dare could you offer your partner that would leave you both smiling?",
    ],
    medium: [
      "What exact bit of teasing from your partner turns laughter into tension for you?",
      "What is one playful look your partner gives that makes you wonder what they are plotting?",
      "What flirtatious rule would you want your partner to set for one evening?",
      "What sensory guessing game would you enjoy playing with your partner while keeping it light?",
      "What mischievous wish involving your partner feels exciting to admit out loud?",
      "What specific kind of teasing from your partner do you want more of before a kiss?",
      "What playful scenario would you plan with your partner to stretch out the anticipation?",
      "What exact dare would you invite your partner to give you once you have agreed on the boundaries?",
    ],
    hot: [
      "What exact kind of teasing from your partner makes patience feel almost impossible?",
      "What is one wickedly playful signal from your partner that instantly gets your attention?",
      "What consensual rule would you want your partner to give you for a deliberately heated hour?",
      "What provocative game would you enjoy playing with your partner before either of you gets what you want?",
      "What is one daring role you would enjoy trying with your partner but have not confessed?",
      "What specific form of playful control would you trust your partner to explore with you?",
      "What boundaries would you set while planning a bold game with your partner?",
      "What exact opening dare would you choose for your partner once you are both eager and fully agreed?",
    ],
  },
  fantasy: {
    mild: [
      "What is one place you have visited with your partner that still feels a little magical?",
      "What exact movie-like moment could you picture your partner creating for the two of you?",
      "What imaginary date would you want your partner to sweep you into for an evening?",
      "What small change of scenery with your partner would make everyday life feel more romantic?",
      "What is one soft daydream about your partner that you have never bothered to say aloud?",
      "What specific wish for time with your partner feels almost too sweet to confess?",
      "What one-night escape would you plan with your partner if logistics disappeared?",
      "What exact first scene would you create for a surprise adventure with your partner?",
    ],
    medium: [
      "What exact setting makes imagining your partner feel more thrilling than usual?",
      "What is one sensual scene with your partner that has wandered through your mind more than once?",
      "What role would you want your partner to play in a fantasy built around anticipation?",
      "What single sensory detail would make a private fantasy with your partner feel real?",
      "What is one fantasy involving your partner that feels vulnerable but exciting to name?",
      "What specific wish about your partner have you edited down whenever you tried to say it?",
      "What scene would you plan with your partner if you could control the lighting, music, and mood?",
      "What exact invitation would begin a fantasy you and your partner had already agreed to explore?",
    ],
    hot: [
      "What exact setting turns a private fantasy about your partner into something intensely vivid?",
      "What is one recurring desire about your partner that gets more compelling each time it returns?",
      "What consensual role would you want your partner to take in your boldest shared scenario?",
      "What single sensation would you build an explicit fantasy with your partner around?",
      "What is one boundary-pushing desire involving your partner that you want to discuss without pressure?",
      "What specific fantasy about your partner feels hottest because it requires complete trust?",
      "What agreements would you make while planning your boldest fantasy with your partner?",
      "What exact opening moment would tell you and your partner that your carefully planned fantasy has begun?",
    ],
  },
} satisfies Record<CategoryId, Record<IntensityId, EightQuestions>>;

export function createFallbackQuestions(input: {
  categories: CategoryId[];
  intensity: IntensityId;
}): GameQuestionContent[] {
  const categories = [...new Set(input.categories)];
  const usableCategories: CategoryId[] = categories.length
    ? categories
    : ["connection"];

  return Array.from({ length: 8 }, (_, index) => {
    const category = usableCategories[index % usableCategories.length];
    return {
      category,
      text: QUESTION_BANK[category][input.intensity][index],
    };
  });
}
export function createFallbackSummary(
  approved: MatchCandidateView[],
): string {
  if (approved.length === 0) {
    return "No shared spark needed to be invented tonight, and that is a good outcome. You both showed up honestly and made room for curiosity without forcing a match. Keep that openness with you; a different question on a different night may light an entirely new flame.";
  }

  const themes = approved.map(({ theme }) => theme.trim()).filter(Boolean);
  const themeList = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(themes);
  const firstPrompt = approved[0]?.discussionPrompt.trim();

  return `What became clear is that you both found something worth lingering over in ${themeList}. The spark here is not a promise or a prescription; it is a shared invitation to stay curious together. For your next adventure, give yourselves a little unhurried space for this question: ${firstPrompt} Keep the warmth, the honesty, and that delicious sense that there is still more to discover.`;
}
