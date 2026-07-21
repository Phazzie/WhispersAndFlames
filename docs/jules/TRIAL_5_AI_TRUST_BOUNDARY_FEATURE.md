# WF-JULES-TRIAL-AI-FEATURE-001 — Fail-closed AI trust boundary and scripted provider

This is a living ExecPlan governed by `.agent/PLANS.md`. Update the living sections while working. The architecture and failure semantics below are frozen for this evaluation; stop rather than inventing a competing trust boundary.

## Purpose / Big Picture

Build a substantial provider-independent safety boundary around Ember, match analysis, and Scribe. The game repository must remain safe even when a future `GameAiPort` implementation is malicious, buggy, malformed, or bypasses the current OpenAI adapter validation. Add a deterministic scripted provider so automated tests can drive exact provider success, refusal, malformed output, unsafe output, timeout/error, and call-count scenarios without live credentials.

The observable result is that unsafe questions never reach players, unsupported themes never reach private review, invented Scribe activities never reach completion, and no AI response can widen the data it receives or leak names, answers, ballots, tokens, rejected themes, or source evidence into a public projection. Zero matches remains a normal successful outcome.

This is an isolated evaluation proposal. Do not inspect or copy PR #82, any other trial PR/branch, legacy code, or archive.

## Progress

- [ ] Prove the exact clean base and read all governing instructions.
- [ ] Inventory the current AI port, adapter validation, repository trust points, fallback behavior, and tests.
- [ ] Centralize provider-independent policy without duplicating competing validators.
- [ ] Revalidate all three AI operations at the repository boundary with the frozen failure behavior.
- [ ] Add the deterministic scripted provider and hostile-provider fixtures.
- [ ] Prove privacy, safety, zero-match, fallback, and call-input invariants end to end.
- [ ] Run the complete validation family, inspect scope, commit, and hand off honestly.

## Surprises & Discoveries

Record branch-specific facts here. A limitation in deterministic natural-language policy is an unresolved risk, not permission to make an unsupported theme pass.

## Decision Log

- Decision: provider adapters are untrusted. Repository-boundary policy revalidates their outputs even if the OpenAI adapter already validated them. Date: 2026-07-21.
- Decision: deterministic safety/evidence policy belongs under `src/lib/game/` and imports no provider/framework module. `src/lib/ai/` may call it; the repository calls it independently. Date: 2026-07-21.
- Decision: one policy implementation serves fallback generation, provider validation, and repository enforcement. Do not fork similar regular expressions or theme catalogs across layers. Date: 2026-07-21.
- Decision: invalid questions roll back the triggering transition and return the existing safe internal error; invalid match output becomes zero matches; invalid Scribe output becomes a deterministic local summary based only on approved candidates. Date: 2026-07-21.
- Decision: Scribe receives no names. Its input is exactly `{ approved }`. Date: 2026-07-21.
- Decision: every `GameAiPort` method receives an `AbortSignal` as a separate second argument, and the repository bounds the untrusted port call. A custom port cannot bypass time limits merely by bypassing the OpenAI adapter. Date: 2026-07-21.

## Outcomes & Retrospective

Complete at handoff with acceptance IDs, command results, real limitations, and a merge-readiness judgment. Passing schema parsing alone is not proof of semantic safety.

## Context and Orientation

The launch message supplies the exact expected source SHA. Jules's own output branch is expected, but initial HEAD must equal that SHA and status must be clean. Run `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git rev-parse HEAD` before edits. On mismatch, stop `BASE_MISMATCH`.

Read root `AGENTS.md`, `.agent/PLANS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, `src/lib/game/AGENTS.md`, and `src/lib/ai/AGENTS.md`. Never read `.env*` or print environment values. Tests use no live key.

`src/lib/game/ports.ts` defines `GameAiPort`. `src/lib/game/memory-repository.ts` currently trusts injected port values after shallow shape checks. `src/lib/ai/validation.ts` and `src/lib/ai/matching.ts` contain provider-adapter policy, which means an alternate injected port can bypass it. This feature removes that bypass without coupling the repository to OpenAI.

Root authorizes the exact `GameAiPort` narrowing and policy files in this packet despite normal shared-interface ownership. No public `RoomView` or HTTP request schema change is authorized.

## Frozen Architecture

### One provider-independent policy module

Create a pure policy module under `src/lib/game/` (a small set of files is acceptable if separation materially improves clarity). It may import only TypeScript types/contracts and pure standard-library functionality. It must not import `openai`, React, Next.js, environment configuration, prompt/persona modules, or provider adapters.

The module owns:

- the canonical sanitized match-theme catalog and deterministic evidence-support rules;
- question safety/category/intensity acceptance;
- match candidate canonicalization, evidence support, sanitization, and source-fragment rejection;
- Scribe summary acceptance plus deterministic safe summary rendering;
- normalized tokenization/polarity helpers shared by those rules.

Refactor `src/lib/ai/matching.ts` and `src/lib/ai/validation.ts` to delegate to this policy after Zod parsing. Do not leave a second theme catalog or weaker provider-only semantic validator behind.

### Question boundary

Accept exactly eight distinct questions. Every question must be in an allowed category, contain one question mark at the end, address `your partner`, stay under the selected intensity ceiling, and reject instruction/markup injection, minors/underage language, coercion/force, incapacitation/sleep, intoxication/drugs, non-consensual framing, violence, unsafe breath restriction/choking, crude anatomical/act language, and yes/no openings.

The repository revalidates the returned questions against the exact submitted configuration before storing them. Invalid output is never partially accepted. Roll back the triggering preference submission as the existing error path intends, expose only `INTERNAL_ERROR`, and keep private inputs out of errors/logs.

### Evidence and match boundary

Delete the generic common-token catch-all. A match exists only for a named canonical catalog theme with independently affirmative evidence from both players, or an explicitly cataloged complementary pair. Unknown shared words, homonyms, and provider-invented themes yield no candidate.

Polarity is clause aware within a deterministic bounded rule: normalize Unicode/contractions, split on sentence and adversative clause boundaries (`but`, `however`, `except`, `although`, `yet`), and require both a catalog term and an explicit affirmative cue in the same clause for each player. The documented cue set must cover forms such as enjoy, love, like, want, welcome, prefer, crave, excited, safe, good, and best. Reject support when the same clause contains negation, aversion, discomfort, pressure/coercion, incapacity, unsafe violence/breath-play language, or a “used to / no longer” reversal. Do not treat a bare noun mention as support and do not attempt unrestricted semantic inference.

Required hostile examples include:

- `I love kissing` versus `I do not want kissing` — zero.
- `I used to enjoy teasing, but I do not anymore` versus affirmative teasing — zero.
- `I like trust` versus `My trust fund paperwork is tedious` — zero.
- `I enjoy leading` versus `I hate being told to follow` — zero, not complementary.
- `I feel pressured into massage` versus affirmative touch — zero.
- one player's affirmative theme and the other's unrelated answer — zero.
- affirmative leading and affirmative following with no negation/discomfort — one canonical complementary candidate.

Provider candidates must name a canonical theme with the compatibility computed by policy. Return the canonical local theme/prompt, never provider wording. Reject the whole provider candidate set to zero if it contains any unknown, duplicated, unsupported, attributed, quoted, source-fragment, markup/instruction, or unsafe candidate. Maximum four.

### Scribe boundary

Narrow `GameAiPort.writeSummary`, every implementation, repository call, mock, and provider function to `{ approved }`; names are removed end to end. Approved candidates contain only canonical sanitized theme, prompt, compatibility, and opaque candidate ID.

At the repository boundary, reject a summary containing names, answer/response/source attribution, quotation marks, instructions/markup, coercion/consent claims, obligation language, unsafe content, or an activity/detail unsupported by approved canonical candidates. Implement unsupported-detail detection with an explicit canonical theme vocabulary plus a small documented neutral connective vocabulary; unknown meaningful activity terms fail closed.

When Scribe output is invalid or throws, complete with a deterministic local summary rendered only from approved canonical candidates. When approved is empty, use the existing honest zero-match ending. Never send raw answers, rejected candidates, names, ballots, preferences, or tokens to Scribe.

### Scripted provider

Add a deterministic `ScriptedGameAi` implementation in `src/lib/ai/` with no network access. It accepts explicit per-operation scripts for return, throw, or never-resolving/abort-aware behavior; records call count and structurally cloned inputs; and never logs them. It must satisfy `GameAiPort` without `any`, broad casts, skipped tests, global mutable singleton state, or real credentials.

Production runtime continues to use the existing resilient provider selection. The scripted implementation is importable by tests and future deterministic E2E fixtures but is never selected from a client-controlled value.

### Bounded untrusted calls

Change each `GameAiPort` operation to accept its input object plus a separate `AbortSignal`. The repository creates the controller and bounded timer, calls the port, aborts on timeout, and applies the operation-specific failure behavior above. The OpenAI implementation forwards that signal to the provider request instead of being the only layer that owns the timeout. Clear every timer in `finally`.

The scripted provider's hang action waits until the supplied signal aborts and then rejects with an abort-shaped error, allowing deterministic timeout proof without arbitrary sleeps. Tests may use fake timers. Do not place signals inside serialized provider input, and do not log abort reasons or payloads.

## Plan of Work

First move and strengthen the deterministic policy while keeping existing safe behavior green. Next narrow Scribe input and make the repository independently enforce questions, matches, and summaries. Then add `ScriptedGameAi` and use it in repository tests to prove the boundary against a deliberately hostile port. Finally update adapter tests so OpenAI validation and fallback behavior still use the same policy.

Do not solve hostile output by trusting `ResilientGameAi`, by checking only Zod shapes, by duplicating policy in tests, by snapshotting sensitive payloads, or by allowing “best effort” partial unsafe candidates.

## Concrete Steps

1. Record clean-base evidence and map every current policy rule, port call, fallback, repository shallow check, and test fixture.
2. Move the single canonical theme/token/polarity and question/Scribe policy below adapters; make existing AI parsing delegate to it and delete duplicate logic.
3. Add the separate-signal `GameAiPort` contract, repository-owned bounded-call helper, and operation-specific fail-closed behavior.
4. Narrow Scribe input to approved candidates only and add deterministic approved-theme/zero-match rendering for unsafe or failed output.
5. Implement `ScriptedGameAi` and the hostile injected-port scenarios, using fake timers for timeout proof and unique inserted secrets for privacy proof.
6. Run focused AI/game tests, the full suite, typecheck, lint, production build, and diff checks; repair only owned paths.
7. Update the living sections, inspect for duplicate policy/sensitive fixtures/scope drift, commit once, and publish only the permitted draft handoff.

## Owned and Prohibited Paths

Allowed only where required:

- `src/lib/game/ports.ts`
- new pure policy files under `src/lib/game/`
- `src/lib/game/memory-repository.ts`
- focused tests under `src/lib/game/**`
- `src/lib/ai/index.ts`
- `src/lib/ai/openai-provider.ts`
- `src/lib/ai/matching.ts`
- `src/lib/ai/validation.ts`
- `src/lib/ai/schemas.ts` only if current parsing cannot express the same external shape
- new scripted-provider files under `src/lib/ai/`
- focused tests under `src/lib/ai/**`

Prohibited: HTTP routes, UI, public `RoomView`/request contracts, canonical persona/prompt sources, dependencies, package/lockfiles, configuration, plans/status docs, migrations, Supabase, CI, deployment, `.env*`, and unrelated formatting. Stop `SCOPE_GAP` instead of expanding.

## Validation and Acceptance

Use unique synthetic secrets in actual scripted inputs, then assert absence from serialized public projections and Scribe calls. Do not “prove” absence using strings never inserted.

- `AI-BND-01`: hostile questions for every named safety family are rejected at the repository boundary even through a custom `GameAiPort` that bypasses `src/lib/ai/validation.ts`.
- `AI-BND-02`: valid curated questions still start the same eight-question flow.
- `AI-BND-03`: every required negation, reversal, homonym, one-sided, coercion, and complementary fixture produces the exact expected canonical set.
- `AI-BND-04`: an injected port's unknown/unsupported/source-fragment candidate set becomes zero matches and never reaches review.
- `AI-BND-05`: a valid injected canonical candidate reaches review with a fresh opaque ID and no source evidence.
- `AI-BND-06`: Scribe receives exactly `{ approved }`; serialized input excludes both names, every raw answer, rejected candidate, preferences, ballots, and tokens.
- `AI-BND-07`: invented or unsafe Scribe output is rejected and replaced by deterministic approved-theme-only text; valid bounded output remains accepted.
- `AI-BND-08`: zero matches completes successfully with the honest deterministic ending and no invented common ground.
- `AI-BND-09`: `ScriptedGameAi` deterministically proves return, throw, abort-aware hang/timeout integration, input cloning, and call counts without network or credentials.
- `AI-BND-10`: OpenAI adapter success, refusal/error, malformed output, timeout/abort, and fallback tests still cross the same policy; no live call occurs.
- `AI-BND-11`: no prompt, provider response, answer, name, token, evidence, or summary payload is logged or placed in an error.
- `AI-BND-12`: types remain strict and no production path can select the scripted provider from request data.

Run from repository root:

    npx vitest run src/lib/ai src/lib/game
    npm test
    npm run typecheck
    npm run lint
    npm run build
    git diff --check

All must pass. Report environment-only failures exactly; do not weaken the boundary or alter configuration.

## Idempotence and Recovery

All scripted fixtures are in-memory and deterministic. Repeated test runs create no external state. If moving policy reveals a circular import or contract conflict, resolve it only inside the frozen direction—game policy is lower-level than AI adapters—or stop `SCOPE_GAP`. Do not leave both old and new policy active.

## Artifacts and Notes

The primary experiment question is whether a richly specified cross-lane feature produces a coherent boundary rather than scattered regular expressions. Review will score duplicated policy, unproven tests, privacy of fixtures, fallback honesty, and how much root repair is needed.

## Interfaces and Dependencies

Use current TypeScript, Zod, Vitest, and OpenAI adapter only. Add no package. `GameAiPort` remains provider-neutral. The repository may import only the pure game-policy layer, never an OpenAI/provider module.

## Handoff

Commit one coherent result. If PR publication is available, open a **draft** PR targeting `production/core-foundation`, titled `[Jules trial v2: AI feature] Fail-closed AI trust boundary`. If the tool cannot target that branch, do not publish a PR; report the branch and commit. Never target the temporary alias, `fresh-main`, or `main`; never merge or deploy.

Final response and PR body must include status, exact base/commit, changed paths, `AI-BND-*` mapping to named tests, validation transcript, unresolved semantic-policy risks, and correctly targeted PR URL if any.
