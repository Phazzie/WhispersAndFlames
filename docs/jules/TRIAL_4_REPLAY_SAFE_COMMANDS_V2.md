# WF-JULES-TRIAL-FEATURE-002 — Replay-safe commands, corrected architecture

This is a living ExecPlan governed by `.agent/PLANS.md`. Update the four living sections while working. This packet is intentionally decision-complete: do not substitute a different concurrency or client-retry architecture merely because it is easier.

## Purpose / Big Picture

Implement the substantial replay-safety feature a second time from the clean production foundation, using the concrete lessons from trial PR #81. The observable result is that a lost response, stale tab, repeated preference mismatch, or two players acting nearly simultaneously never applies intent to the wrong step, never forces a valid second player to click twice, and never leaves the browser permanently reusing an operation identifier for a new intent.

This is an isolated evaluation proposal, not accepted production architecture. It may become production work only after root review. Do not read, copy, cherry-pick, or adapt code from PR #81 or any Jules output branch. Work only from the exact supplied base and this packet.

## Progress

- [ ] Prove the exact clean base and read every governing instruction.
- [ ] Inspect the current repository, routes, hook, screens, and tests without reading other trial branches.
- [ ] Implement the frozen command/replay contract and preference-round identity.
- [ ] Implement immutable client pending-intent ownership and honest retry UX.
- [ ] Add repository-backed adversarial proof plus focused React/API tests.
- [ ] Run every required command and inspect the final diff for scope/privacy violations.
- [ ] Commit one coherent result and publish only the permitted draft evaluation PR.

## Surprises & Discoveries

Record only facts discovered on this branch. Do not use this section to weaken a requirement. If the frozen architecture cannot be implemented inside the owned paths, stop with `SCOPE_GAP`.

## Decision Log

- Decision: a command's `operationId` belongs to one immutable payload, not to a screen or phase. The client retains that exact payload only while the transport result is unknown. Date: 2026-07-21.
- Decision: `expectedVersion` is an observed-version guard, not a global compare-and-swap. A partner-only update on the same exact step remains valid; phase and typed step identity prevent drift. Date: 2026-07-21.
- Decision: preferences expose a monotonically increasing private-protocol `round` in both personalized projections. A no-overlap reset increments the round, so the next choice is a new logical intent even when `retryReason` is unchanged. Date: 2026-07-21.
- Decision: replay lookup precedes stale/phase checks. The fingerprint contains the complete canonical payload, including `expectedVersion`. Date: 2026-07-21.
- Decision: tests that mock the API may prove rendering details, but the response-loss acceptance story must also traverse the actual `MemoryGameRepository`; mocked call counts alone are insufficient. Date: 2026-07-21.

## Outcomes & Retrospective

Leave incomplete until the final handoff. State which acceptance IDs passed, which did not, what remains risky, and whether the proposal is actually merge-ready. Never report “no risks” merely because commands pass.

## Context and Orientation

The launch message supplies an exact expected starting branch and full SHA. Jules will create its own `jules-*` branch; that output branch is expected. Before any edit, run `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git rev-parse HEAD`. Initial status must be clean and initial HEAD must equal the supplied SHA. If not, make no changes and finish `BASE_MISMATCH`.

Read root `AGENTS.md`, `.agent/PLANS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, and the nearest nested `AGENTS.md` for every owned path. Never inspect `.env*`, values, legacy checkouts, PR #81, another Jules branch, archives, or copied implementations.

The current server-authoritative adapter is `src/lib/game/memory-repository.ts`. Request schemas and `RoomView` are in `src/lib/game/contracts.ts`. Thin route handlers are under `src/app/api/rooms`. Browser transport and orchestration are `src/components/game/api-client.ts` and `src/components/game/use-room-session.ts`; phase screens live beside them.

Root explicitly authorizes the contract changes named below for this evaluation packet despite the usual frozen-contract ownership rule. No other shared-contract change is authorized.

## Frozen Interfaces and Semantics

### Command envelope

Preferences, answer/skip, ballot, and ready inputs contain:

- `operationId`: UUID generated once for one immutable logical intent.
- `expectedVersion`: non-negative integer copied from the rendered `RoomView` and retained unchanged on an unknown-result retry.
- exact action payload.
- typed step identity: answer ordinal; complete ballot candidate-ID set; ready candidate ID plus discussion ordinal; preferences round.

Add `preferences.round`, a positive integer, to the preferences projection and preference command. Internal rooms start at round 1. Every no-overlap reset increments it exactly once. Both players receive the same round number, but never either player's categories or intensity.

Schemas reject negative versions, round/ordinal values below 1, duplicate categories, duplicate ballot candidate IDs, incomplete ballot candidate sets, and unknown fields.

### Fresh-command validation

Inside the room lock, authenticate first, then perform replay lookup. For a new operation:

1. Reject `expectedVersion > room.version` as `BAD_REQUEST`; a client cannot have observed the future.
2. Require the current phase and typed step identity to match exactly. A mismatch is `STALE_COMMAND` and changes no state.
3. Do **not** require `expectedVersion === room.version`. If the version increased only because the partner submitted on this still-current step, the command remains valid.
4. Enforce the existing self-already-submitted rule.
5. Apply at most once inside the existing room lock.

This rule is intentional. For example, if both players render question 1 at version 10, player A may submit at version 10 and increment the room. Player B's version-10 answer for question 1 must still succeed because question 1 is current. An answer for question 1 after the room reaches question 2 must fail `STALE_COMMAND`.

### Replay record

Replay records are scoped by room, authenticated player, action kind, and `operationId`. Store a deterministic fingerprint of the complete canonical input excluding only `operationId`. Include `expectedVersion`, preference round, ordinal, candidate identity, sorted categories, and canonically key-ordered/sorted ballot decisions as applicable.

Lookup occurs before phase/version checks. An exact replay returns the **current** allowlisted personalized projection without incrementing version or rerunning Ember, match analysis, or Scribe. Same player and ID with any changed payload field or different action fails `BAD_REQUEST`. The other player may use the same UUID independently.

When a no-overlap result clears preferences, record the triggering operation before returning its stable error, increment `preferences.round`, and allow the next round to use a new operation ID. Never key client operation ownership by `retryReason`.

### Immutable client pending intent

Extract the transport-independent pending-command lifecycle from the React hook into a small typed coordinator under `src/components/game/`. The hook must use that coordinator; do not create test-only logic.

The coordinator owns at most one `PendingRoomIntent`, a discriminated union containing action kind, immutable deep-copied payload, operation ID, observed view version, typed step identity, and status `in_flight` or `unknown_result`.

- A fresh submit creates and sends the pending payload once.
- While pending, every editable control in preferences, questions, review, and discussion is disabled. This includes category buttons, intensity radios, answer/skip, and approve/pass buttons, not only the final submit button.
- A successful HTTP response is definitive: accept its projection, then clear pending.
- A structured HTTP error with a response is definitive: clear pending. On `STALE_COMMAND`, fetch and render the authenticated projection; if refresh succeeds, do not retain the obsolete error banner.
- A transport failure with no HTTP response is unknown: keep the exact pending payload, unlock only a dedicated `Retry same submission` action, and keep all intent-editing controls disabled.
- Retrying sends the byte-equivalent logical JSON payload with the same ID, version, and step identity. It never reads current form state or rebuilds from a newer view.
- A user cannot dismiss an unknown-result notice in a way that silently discards or mutates the pending intent. `Forget session` may clear it only as part of the existing explicit local-session abandonment.
- A late projection whose version is lower than the accepted `viewRef.current` version is ignored. Update refs outside React state-updater callbacks so those callbacks remain pure.

Extend `StatusNotice` only as needed for a keyboard-accessible retry action. Do not redesign the visual system.

### Stable public behavior

Map `STALE_COMMAND` to HTTP 409. Messages contain no partner-private values. Do not add partner preferences, answers, skips, ballots, evidence, tokens, or replay fingerprints to any response or error.

## Plan of Work

First evolve the authorized schemas/projection and repository semantics. Keep route handlers thin. Then implement the typed pending-intent coordinator and make `useRoomSession` delegate to it. Finally wire the screens so every edit is locked during in-flight or unknown-result intent, add the explicit retry notice, and prove the behavior at repository, coordinator, API, and React boundaries.

Do not preserve the old “one operation ID per string screen coordinate” design for compatibility. Do not accept an implementation that clears pending on `NETWORK_ERROR`, rebuilds the payload on retry, uses exact global-version equality, or tests repository behavior only through mocks.

## Concrete Steps

1. Record clean-base evidence and inventory the exact current command inputs, projections, repository replay map, route parsing, hook state, error notice, and phase controls.
2. Add bounded numeric schemas, preference round, complete typed step identity, canonical fingerprints, replay-first lookup, and same-step partner concurrency to the repository and focused tests.
3. Extract the production pending-intent coordinator, make the hook delegate to it, and use one immutable copied payload across unknown-result retry.
4. Wire stale refresh, monotonic projection acceptance, explicit retry notice, and complete interaction locking without changing unrelated visuals.
5. Add the `RS2-*` repository-backed schedules first; then add only the API/React tests needed for boundary rendering and accessibility.
6. Run the focused suite, full suite, typecheck, lint, production build, and diff checks. Repair only inside owned paths.
7. Update the living sections, inspect every changed path against this packet, commit once, and publish only the permitted draft handoff.

## Owned and Prohibited Paths

Allowed only when genuinely required:

- `src/lib/game/contracts.ts`
- `src/lib/game/errors.ts`
- `src/lib/game/repository.ts`
- `src/lib/game/memory-repository.ts`
- focused tests under `src/lib/game/**`
- `src/app/api/rooms/**` and focused API tests
- `src/components/game/**` and focused component/coordinator tests

Prohibited: AI modules/prompts, persona sources, dependencies, `package.json`, lockfiles, framework/test configuration, root layouts, plans, CI, migrations, Supabase, deployments, `.env*`, and unrelated formatting. Do not edit `PROJECT_STATUS.md` or this packet. Stop `SCOPE_GAP` rather than expanding.

## Validation and Acceptance

Each ID needs a deterministic named test whose assertion proves the claim rather than merely counting a mocked call.

- `RS2-01`: exact answer retry after response loss and partner advancement returns the current projection, does not answer the later question, and does not increment version.
- `RS2-02`: changing any field, including `expectedVersion`, with the same operation ID fails without state change.
- `RS2-03`: two players submitting from the same rendered version on the same question each succeed once; the room advances without a stale retry click.
- `RS2-04`: old question ordinal, old preference round, wrong ballot set, or wrong discussion identity returns `STALE_COMMAND` with no mutation.
- `RS2-05`: three consecutive no-overlap preference rounds remain usable; every new round creates a new ID and no player becomes stuck.
- `RS2-06`: a transport failure retains a byte-equivalent immutable payload and locks every editable control; retry sends exactly that payload.
- `RS2-07`: a definitive stale response clears pending, refreshes to the current projection, and does not show a stale error after successful refresh.
- `RS2-08`: a lower-version late response cannot overwrite a newer projection, using a real deferred-promise race rather than two sequential refresh calls.
- `RS2-09`: exact retries at question generation, match generation, and Scribe completion do not rerun those operations. Exercise all three operations.
- `RS2-10`: insert unique synthetic partner preferences/answers/ballots/tokens into actual repository state paths and prove replay/error JSON never contains them.
- `RS2-11`: all new numeric bounds and strict-object rules reject malformed input at the route schema boundary.
- `RS2-12`: focused hook/UI tests prove all relevant controls are disabled for both `in_flight` and `unknown_result` and that retry is keyboard accessible.

At least `RS2-01`, `RS2-03`, `RS2-05`, `RS2-06`, `RS2-08`, `RS2-09`, and `RS2-10` must traverse the actual `MemoryGameRepository` or the production coordinator wired to a repository-backed transport. API mocks may supplement but not replace that proof.

Run from repository root:

    npx vitest run src/lib/game src/app/api src/components/game
    npm test
    npm run typecheck
    npm run lint
    npm run build
    git diff --check

All must pass. If the environment alone prevents one, report the exact command and evidence; do not weaken tests or change configuration.

## Idempotence and Recovery

Do not retry an ambiguous session launch; the root controller handles that. Within the feature, every acceptance test may be rerun without persistent state. If implementation reveals a genuine contract contradiction, stop at a clean worktree with `SCOPE_GAP` and identify the exact conflicting requirements. Do not silently choose one.

## Artifacts and Notes

The prior trial's failure modes are requirements here, not optional review suggestions: global-version rejection of normal partner activity; permanent per-screen operation IDs; repeated no-overlap deadlock; mutable payload reuse after network loss; side effects inside React state updaters; stale error after successful refresh; incomplete AI retry proof; privacy assertions over strings never inserted; sequential “race” tests; omitted numeric bounds; and omitted `expectedVersion` fingerprints.

## Interfaces and Dependencies

Use existing TypeScript, Zod, Vitest, React Testing Library, and Next.js only. Add no dependency. Preserve `GameRepository` as the replaceable server boundary and keep the client dependent only on allowlisted `RoomView`/API responses.

## Handoff

Commit one coherent result. If PR publication is available, open a **draft** PR targeting `production/core-foundation`, titled `[Jules trial v2: feature] Correct replay-safe commands and pending intents`. Never target the temporary launch alias, `fresh-main`, or `main`; never merge or deploy. If the tool cannot choose `production/core-foundation`, do not open a PR—report the branch/commit for root instead.

The PR/final response must include: status (`COMPLETE`, `BASE_MISMATCH`, `SCOPE_GAP`, or `BLOCKED`), base SHA, commit SHA, exact changed paths, acceptance-ID-to-test mapping, concise command transcript, unresolved risks, and PR URL if one was correctly published.
