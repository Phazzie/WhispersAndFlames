# WF-JULES-TRIAL-FEATURE-001 — Replay-safe commands and stale-tab protection

## Capability being tested

This is a substantial full-stack production feature. Show whether Jules can evolve shared runtime contracts, server-authoritative transition behavior, thin HTTP handlers, client intent ownership, and adversarial tests as one coherent system without weakening privacy or wandering into unrelated architecture.

The result is an isolated draft proposal for evaluation. It does not become accepted production architecture merely because it compiles or has a PR.

## Base check — mandatory before all other work

The launch message supplies an exact expected **starting branch** and full expected Git SHA. Jules is expected to create and work on its own `jules-*` branch; that branch name is not a mismatch. Before editing, run `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git rev-parse HEAD`. The worktree must be clean and the initial HEAD of Jules's branch must equal the supplied SHA, proving that its branch starts from the intended production commit. If HEAD differs or the tree is dirty, make no changes and finish with `BASE_MISMATCH`, showing the observed Jules branch and SHA. Never inspect or print `.env*` files or values. Do not use legacy code, base branches, archives, or copied implementation.

Read root `AGENTS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, and every nested `AGENTS.md` governing a path before editing.

## User-visible outcome

A response can be lost, a tab can become stale, or both players can act close together without applying a player's intent to the wrong question, match ballot, or discussion step.

- Retrying the same logical operation after response loss never applies it twice and never consumes a later step.
- A new command created from an old screen is rejected safely instead of being reinterpreted against current state.
- A reused operation ID with different intent is rejected as a conflict, not silently accepted.
- The client can recover by fetching the current personalized projection without receiving partner-private data.

## Required contract

Implement one consistent command envelope across **preferences, answer/skip, match ballot, and discussion ready**:

1. Every mutation carries `operationId` and `expectedVersion` from the exact `RoomView` the player saw.
2. Answer/skip also binds to the displayed question ordinal.
3. Ballot intent binds to the exact displayed candidate ID set, not merely whatever review candidates exist when the request arrives.
4. Discussion readiness binds to the displayed candidate ID and discussion ordinal.
5. Add a stable public `STALE_COMMAND` error for a new operation whose expected version or step identity is no longer current. Keep messages free of partner-private information.
6. Idempotency lookup happens before stale-version rejection. An exact replay by the same authenticated player and action must not reapply the transition even if the room has since advanced.
7. Key replay ownership by room, authenticated player, action, and operation ID. The same UUID used by the other player must not collide.
8. Store a deterministic fingerprint of the original intent. Reusing an operation ID with a different action or payload must fail safely.
9. An exact replay returns a current allowlisted projection for that player without incrementing the version or rerunning AI.

Do not implement create/join replay in this packet; admission/recovery identity requires the pending contract freeze. Do not introduce Supabase. Keep the in-memory implementation replaceable behind the existing repository boundary.

## Client behavior

- Build every command from an immutable snapshot of the rendered view.
- Generate one operation ID for one logical intent and retain it across network/timeout response loss until the server gives a definitive success or stable rejection.
- Do not generate a new ID merely because the transport result was unknown.
- Prevent re-entrant edits/submissions while an intent is unresolved.
- On `STALE_COMMAND`, fetch and render the newest authenticated projection and explain that the room moved forward; never guess whether the original mutation committed.
- Late responses from older operations may not overwrite a newer projection.

## Owned paths

Changes are allowed only where this feature genuinely requires them:

- `src/lib/game/contracts.ts`
- `src/lib/game/errors.ts`
- `src/lib/game/repository.ts`
- `src/lib/game/memory-repository.ts`
- focused tests under `src/lib/game/**`
- `src/app/api/rooms/**`
- focused tests under `src/app/api/**`
- `src/components/game/**`

Do not change AI modules or prompts, persona sources, dependencies, lockfiles, framework/test configuration, root layouts/styles, plans, CI, migrations, or add Supabase. Stop with `SCOPE_GAP` rather than expanding scope.

## Adversarial acceptance proof

Add deterministic tests for at least these cases:

1. The server commits an answer, the response is lost, the partner advances the room, and retrying the identical operation does not answer the next question or increment the version again.
2. A stale tab submits a new operation after another transition; it receives `STALE_COMMAND` and no state change.
3. The same player reuses an operation ID with changed answer text, skip state, ballot, or ready identity; the second intent is rejected.
4. Different players use the same UUID; their operations remain independent.
5. An answer for question 1 cannot land on question 2.
6. A ballot cannot be applied to a different candidate set.
7. Ready intent cannot apply to another discussion candidate or ordinal.
8. Exact retries do not rerun Ember, match analysis, or Scribe.
9. API errors and replay responses contain no partner preferences, answers, skips, ballots, source evidence, or tokens.
10. The browser reuses an operation ID after simulated transport loss and replaces stale UI only after an authenticated snapshot refresh.

Do not satisfy these with mocks that bypass the actual repository transition path. Do not weaken types with `any`, broad casts, skipped tests, disabled lint rules, arbitrary sleeps, or compatibility fields retained without use.

Run from the repository root:

    npx vitest run src/lib/game src/app/api src/components/game
    npm run typecheck
    npm run lint
    npm run build

If a command fails because of your change, repair it within owned paths. If it fails for a proven unrelated baseline/environment reason, report the exact command and concise evidence without changing unrelated files.

## Handoff

Commit a coherent feature on Jules's isolated branch. If Jules offers PR publication, open a **draft PR targeting `production/core-foundation`**, prefix its title with `[Jules trial: feature]`, and include the expected base SHA, contract changes, failure semantics, exact changed paths, adversarial validation results, and unresolved risks. Never target `fresh-main`, merge, deploy, modify another PR, or auto-fix unrelated CI failures.

The final response must contain: status (`COMPLETE`, `BASE_MISMATCH`, `SCOPE_GAP`, or `BLOCKED`), commit SHA if any, exact changed paths, validation transcript summary, PR URL if published, and unresolved risks.
