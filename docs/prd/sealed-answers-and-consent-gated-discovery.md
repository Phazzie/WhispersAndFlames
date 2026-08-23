# PRD: Sealed answers and consent-gated discovery

> **Status:** proposed
> **Author:** Bellows (Claude Code session `01C3XLMYKmTzL4vYumhpSWNp`)
> **Date:** 2026-08-23
> **Verified against:** `main` @ `31f6bc9`

---

## Summary

Two people answer intimate questions. Today the app shows them each other's answers, and
the AI writes a summary of both. This proposes a different contract: **answers are never
shown, themes are extracted from them, and each partner privately approves which themes
become conversation — with only mutually-approved themes surfacing.**

The design is not new. It was worked out on `production/core-foundation` in July 2026 and
never shipped. This is that idea ported onto the codebase that actually runs.

---

## The problem

### 1. There is a live leak, today

`GET /api/game/[roomCode]` returns the whole game object with no projection:

```ts
return NextResponse.json({ game }, { status: 200 });
```

`game.gameRounds[].answers` holds **both** players' answers, and the client polls this
route every 2 seconds. So your partner's answer is in your browser before you have written
your own. The UI declines to draw it; the network tab does not.

Anyone who opens devtools during a session can read what their partner wrote, at any point,
including before answering. On an app whose premise is simultaneous honest disclosure, that
is not a small thing — it converts a mutual reveal into a one-sided advantage, silently.

### 2. Disclosure is unilateral, which is the harder problem

Even with the leak fixed, the current design asks each person to expose something and hope
for reciprocity. If one partner writes something vulnerable and the other doesn't reciprocate,
the first is exposed alone, with no way to take it back.

That asymmetry is the reason people play these games cautiously — and cautious answers are
worse answers, which makes the product worse at the thing it exists to do.

---

## The proposal

### Sealed answers

The server stops sending answers to the partner. Each player's view carries only:

```ts
selfSubmitted: boolean;
partnerSubmitted: boolean;
```

Not the text. Not a redacted string. The field is absent from the projection, so leaking it
requires changing the projection rather than forgetting a UI guard.

### Theme extraction

When both have answered all questions, the AI reads both answer sets and proposes
**candidate themes** — never quoting either player:

```ts
{ candidateId, theme, discussionPrompt, compatibility: 'shared' | 'complementary' }
```

### Private ballots

Each player independently marks each candidate **approve** or **pass**. Neither sees the
other's ballot, then or ever.

### Mutual-approval gating

Only candidates **both** approved unlock for discussion. A pass reveals nothing — there is no
view, no count, and no inference path that tells you what your partner wanted and you didn't.

This is the swipe-right mechanic applied to intimacy: you can express interest in something
and your partner never learns you did unless they independently expressed it too.

### Summary from approved themes only

The closing note is built from mutually-approved themes. Not from raw answers, and not from
themes only one person approved.

---

## Why this is worth doing

The privacy property is the product. Everything else here — categories, spicy levels,
achievements — is scaffolding around getting two people to say true things to each other.
Sealed answers plus consent gating is the only part of the design that makes saying a true
thing _safe_, and it is the part that is missing.

It also closes the leak in §1 structurally rather than by patching a UI.

---

## Scope

### In

- A projection layer between storage and the GET route, so a player's view is derived rather
  than dumped.
- `answers` removed from the partner's projection; submitted-flags added.
- A `ballots` structure on game state, per player, per candidate.
- Theme extraction as an AI flow returning candidates without quoting answers.
- A review step where candidates are voted on, and a discussion step gated on mutual approval.
- Summary generation reading approved themes rather than raw answers.

### Out

- Rewriting the client into per-action endpoints. Related and desirable, but separable — see
  `per-action-endpoints.md`.
- Trio support. Ballots for three players raise their own questions (unanimity or majority?),
  covered in `multi-player-support.md`.
- Any change to categories, spicy levels, achievements, or visual memories.

---

## Acceptance criteria

1. A player's projection **never** contains another player's answer text, asserted by a test
   that inspects the serialized response rather than the UI.
2. A player's projection never contains another player's ballot.
3. A candidate appears in the discussion step only when both players approved it.
4. Given one approve and one pass, neither player can distinguish "partner passed" from
   "partner has not voted yet" from any data reaching their client.
5. The closing summary contains no verbatim answer text.
6. The existing two-player integration test — which does not mock storage — still passes.

Criterion 4 is the one that needs adversarial review. It is easy to satisfy in the UI and
violate in the payload.

---

## Risks

**This changes what the game _is_.** Some couples may prefer seeing each other's raw answers.
Worth deciding whether sealed answers replace the current flow or become a mode.

**Theme extraction can leak by inference.** `production/core-foundation` recorded exactly
this as an unfixed blocker: question sequencing and no-overlap behaviour can reveal
information even when no answer is quoted. Whatever is built here inherits that problem and
must address it rather than assume the AI's discretion is sufficient.

**AI cost and latency rise.** An extra extraction pass per session, on top of question
generation and the summary.

**Migration.** Games in flight when this ships have a state shape the new projection does not
expect. Expiry is 24 hours, so a deploy window past that avoids the question entirely.

---

## Open questions for the owner

1. Does this **replace** the current reveal flow, or sit beside it as a mode?
2. Ballots for trios — unanimity, or majority? (Blocks `multi-player-support.md`.)
3. Should a player be able to change a ballot before both have voted?
4. Does the leak in §1 warrant a hotfix now, ahead of the full model? A projection that
   strips other players' answers is a much smaller change than everything above.

Question 4 is the one worth answering first.
