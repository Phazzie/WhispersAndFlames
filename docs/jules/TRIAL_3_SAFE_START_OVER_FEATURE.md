# WF-JULES-TRIAL-FEATURE-001 — Safe Start Over feature

## Capability being tested

This is a complete user-facing feature, not a one-line repair. Show whether Jules can understand an existing React flow, design an accessible interaction within frozen boundaries, repair asynchronous lifecycle behavior, add meaningful tests, and deliver a coherent draft PR without wandering into server architecture.

## Base check — mandatory before all other work

The launch message supplies an exact expected branch and full expected Git SHA. Run `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git rev-parse HEAD` before editing. If the checkout is dirty, the branch is not `production/core-foundation`, or HEAD differs from the supplied SHA, make no changes and finish with `BASE_MISMATCH`, showing only the observed branch and SHA. Never inspect or print `.env*` files or values. Do not use legacy code, branches, archives, or copied implementation.

Read root `AGENTS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, `src/components/AGENTS.md`, and the existing client tests before editing.

## User-visible feature

Turn the current immediate **Start over / Forget this room** behavior into a safe, honest, accessible leave flow.

When a player chooses Start over from an active room, the recovery screen, or completion:

1. Ask for confirmation before clearing the local session.
2. Explain plainly that this removes access on this device but does **not** delete server-held room data or remove the other player.
3. Cancel polling, refreshes, entry requests, and mutations associated with the abandoned session.
4. Ensure any response that arrives after confirmation cannot restore the old room, overwrite a new session, change connection state, or display a stale error.
5. After confirmation, clear only the allowed local session credential and return to the landing screen.
6. Canceling leaves the current room and request lifecycle untouched.

The confirmation must be keyboard and screen-reader usable: labelled dialog semantics, sensible initial focus on the non-destructive choice, Escape cancellation, focus containment while open, and focus restoration when canceled. Use platform behavior or small local React code; add no dependency.

## Owned paths

Only these paths may change:

- `src/components/game/**`
- `src/app/globals.css` for styles used solely by this feature

Do not change routes, `src/lib/game/**`, `src/lib/ai/**`, shared contracts, package files, lockfiles, configuration, plans, persona/prompt sources, or migrations. Do not invent a server-delete endpoint or claim that local forgetting deletes server data. Stop and report `SCOPE_GAP` rather than expanding scope.

## Required engineering behavior

- Use an explicit session/request generation or equivalent robust ownership mechanism so late promise resolution and `finally` blocks cannot mutate state belonging to a later session.
- Abort every client request that can be aborted; generation checks must still protect against mocks or transports that resolve despite abort.
- Ensure no cancellation-generated `AbortError` becomes a user-visible error.
- Keep only `roomId` and `playerToken` in existing session storage; introduce no new browser persistence.
- Preserve create, join, polling, manual refresh, preferences, answer, ballot, ready, recovery, and completion behavior.
- Add focused tests that prove confirmation/cancel behavior, confirmed clearing, abort behavior, and—most importantly—a deliberately late old-room response cannot resurrect or corrupt the next session.
- Do not weaken tests, add arbitrary sleeps, disable lint rules, use `any`, or broadly reformat unrelated UI.

Run from the repository root:

    npx vitest run src/components/game
    npm run typecheck
    npm run lint
    npm run build

If a command fails because of your change, repair it within the owned paths. If it fails for an unrelated environment or baseline reason, report the exact command and concise failure without changing unrelated files.

## Handoff

Commit one coherent feature on Jules's isolated branch. If Jules offers PR publication, open a **draft PR targeting `production/core-foundation`**, prefix its title with `[Jules trial: feature]`, and include the expected base SHA, user-visible behavior, changed paths, test evidence, screenshots only if they contain no private data, and unresolved risks. Never target `fresh-main`, merge, deploy, alter another PR, or auto-fix unrelated CI failures.

The final session response must contain: status (`COMPLETE`, `BASE_MISMATCH`, `SCOPE_GAP`, or `BLOCKED`), commit SHA if any, exact changed paths, validation transcript summary, PR URL if published, and unresolved risks.
