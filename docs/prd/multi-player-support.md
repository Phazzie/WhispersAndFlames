# PRD: Multi-player (trio) support

> **Status:** proposed
> **Author:** Bellows (Claude Code session `01C3XLMYKmTzL4vYumhpSWNp`)
> **Date:** 2026-08-23
> **Verified against:** `main` @ `31f6bc9`
> **Closes:** divergence **D1** in `docs/ember-prompt-audit.md`

---

## Summary

Both persona specs describe a game for **two or three** players. The code half-supports it:
three people can join, and most of the app handles the count — but the question generator has
no idea how many players there are and cannot be told.

This proposes closing that gap by threading player count through to the AI, which also
unblocks the tenth question pattern that has never shipped.

---

## Current state, verified

### Three people can already join

`src/app/api/game/join/route.ts` caps nothing. It checks the caller isn't already in the
game and appends:

```ts
players: [...game.players, newPlayer];
```

There is no maximum. A third player joins successfully today.

### Parts of the app expect more than two

`playerCount` is a real input to the summary and therapist-notes flows, and the UI has
had explicit multi-player work — PR #77 was titled _"Improve 2-player game step layouts and
capacity messaging."_

### But question generation is blind

```ts
const GenerateContextualQuestionsInputSchema = z.object({
  categories,
  spicyLevel,
  previousQuestions,
});
```

No player-count field. No caller can supply one. So with three players in the room, Ember is
still writing questions addressed to "your partner", singular.

### And a whole pattern has never shipped

`docs/ember-persona.md:151` and `aiprompting.md:152` define ten question patterns.
**`PATTERN #9: THE CHOREOGRAPHY PATTERN (Trios)`** — the one built for three-person dynamics,
with four worked trio examples behind it — has never appeared in any prompt, including the
pre-April one. It is not something a refactor dropped; it was never wired up.

`src/__tests__/ai/personas.test.ts` currently asserts it stays **absent**, with a comment
explaining why: a trio pattern in a prompt that cannot know whether it is serving a trio
would let the model aim three-person questions at couples. That guard is deliberate, and this
PRD is what removes it.

---

## The problem, stated plainly

The app lets three people in and then talks to them as though there are two. Either support
trios properly or stop admitting them — but the current middle is the worst option, because
it fails silently and only in the AI's phrasing, which no test would catch.

---

## The proposal

### 1. Thread player count to the question flow

Add `playerCount` to `GenerateContextualQuestionsInputSchema`, supply it from the caller in
`src/app/game/actions.ts`, and use it in the prompt.

### 2. Make the prompt player-count aware

`EMBER_IDENTITY` in `src/ai/personas.ts` says "give couples permission…". The spec's line is
"give couples **(or trios)** permission…". Restore the parenthetical, and make the "always
about them" rule address the right number of people.

### 3. Ship the Choreography pattern, gated

Add `PATTERN #9` to `QUESTION_PATTERNS`, conditioned on `playerCount > 2` so couples never
see it. Flip the guard test from "asserts absent" to "asserts present only for trios".

### 4. Decide the cap, and enforce it

Two or three is what the specs describe. If that is the intent, `join/route.ts` should refuse
a fourth player rather than silently accepting one.

---

## Scope

### In

- `playerCount` through the question schema, actions, and prompt.
- Choreography pattern, gated on count.
- An explicit maximum in the join route, with a clear error.
- Tests: trio prompts include Choreography; couple prompts exclude it; the join cap holds.

### Out

- Ballots for trios — the consent-gating design is two-player. Unanimity versus majority is a
  real product question and belongs with `sealed-answers-and-consent-gated-discovery.md`.
- Trio UI layout beyond what PR #77 already did.
- More than three players. Nothing in the specs describes it.

---

## Acceptance criteria

1. A question generated for a three-player game addresses three people, verified by
   inspecting the composed prompt rather than the model's output.
2. The Choreography pattern appears in the prompt when `playerCount > 2` and never otherwise.
3. A fourth player attempting to join receives a clear refusal, not a silent success.
4. Existing two-player behaviour is unchanged — same prompt content as before for
   `playerCount === 2`.

Criterion 4 matters: this should be strictly additive for couples, who are the entire current
user base.

---

## Risks

**The AI can't be tested directly.** These criteria check prompt _composition_, not model
output. That is the right level — it is what `personas.test.ts` already does — but it means a
trio question that reads badly would still pass. A manual read of a few generated trio
questions should gate the release.

**Trios may not be wanted.** It is equally defensible to cap the game at two and delete the
Choreography pattern from the specs. That is cheaper and removes the divergence just as
completely. **This decision should be made before any code is written** — the work only makes
sense if trios are actually a product goal.

**Interaction with sealed answers.** If consent gating ships first, trio ballots need a rule.
If trios ship first, that rule has to be retrofitted. Sequencing matters.

---

## Open questions for the owner

1. **Are trios a real product goal, or spec cruft?** If cruft, the cheaper fix is to cap at
   two and remove the pattern from the specs — and this PRD should be closed rather than built.
2. If real: unanimity or majority for trio ballots?
3. Should a trio's questions ever address one specific partner, or always the pair?

Question 1 gates everything else.
