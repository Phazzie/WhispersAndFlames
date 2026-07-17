# AI Ownership

Own `src/lib/ai/**` and its focused tests. Do not edit `AI_PERSONAS.md`, `aiprompting.md`, server routes, UI, package files, or shared game contracts.

- Preserve Ember and Scribe as distinct, nuanced personas. `AI_PERSONAS.md` and `aiprompting.md` are canonical.
- Use a provider-neutral `GameAi` interface with a lazy, server-only OpenAI implementation.
- Use the Responses API and Zod structured outputs for questions and sanitized match candidates. Return plain text for Scribe only after validation.
- Bound latency and failures. Every operation must return a deterministic curated fallback without blocking the game.
- Match candidates require evidence from both players but may expose only a short theme, a discussion prompt, and shared/complementary compatibility. No quotes, attribution, answer fragments, or source IDs.
- Scribe receives only mutually approved sanitized candidates, never raw answers or rejected candidates.
- Never log prompts, answers, tokens, raw provider responses, or secrets.
