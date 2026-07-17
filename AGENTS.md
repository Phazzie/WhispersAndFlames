# Whispers and Flames Agent Guide

This is a fresh implementation. The archived rebuild and legacy application are reference archives, not code sources.

## Product invariants

- Build a Next.js two-player conversation game backed by Supabase.
- Preserve Ember and Scribe exactly as separate personas. Their canonical sources are `AI_PERSONAS.md` and `aiprompting.md`.
- Exactly two consenting adults participate in a room.
- The server owns game state. A player never receives the partner's raw preferences, answers, skips, or ballot.
- Similar themes may be proposed only when both answers support them. Both players must privately approve a sanitized theme before discussion.
- Scribe receives only mutually approved sanitized themes.
- Zero matches is valid. Fail closed rather than inventing common ground.

## Fresh-start boundary

- Do not copy, import, or adapt implementation code from `/Users/hbpheonix/whispersandflames`, `/Users/hbpheonix/whispersandflames-v2`, archive branches, or archive bundles.
- The only carried-forward content is the canonical persona and prompt text already present in this worktree.
- Re-discover current requirements from this repository and explicit user decisions. Do not silently revive archived architecture.

## Build order

1. Prove two isolated players can create/join, receive one fixed shared question, submit privately, and synchronize.
2. Expand that proven path to eight questions and matching.
3. Add Ember and Scribe through separate provider-neutral ports.
4. Add visual polish after the multiplayer path works.
5. Deploy only after privacy, recovery, and two-browser behavior are proven.

## Commits, PRs, and subagents

- `fresh-main` is the integration branch. Substantial work reaches it through a PR; do not push feature work directly to it.
- Keep at most one major implementation PR open at a time. Start the next branch from the merged integration head so there is no dependent PR stack.
- Commit coherent recovery points locally. A PR represents a meaningful user-visible or trust-boundary outcome, not a tiny file change.
- Subagents use separate branches/worktrees with explicit owned and prohibited paths. Root is the sole integrator and cloud operator.
- Review the coherent change, batch feedback, then run the expensive global gate once before merge.

## Verification

- During editing, run only directly related tests and formatting.
- At a worker handoff, run owned-path checks and one relevant typecheck.
- At a PR boundary, run meaningful integration/privacy tests for that outcome.
- At release, run the complete lint, typecheck, test, privacy, accessibility, browser, audit, and production-build suite.
- Coverage percentage is informational. Tests must prove important behavior, races, authorization boundaries, failure paths, and data deletion.
- Bound unchanged tooling retries. Record environment failures separately from application failures.

## Security

- Never print, commit, or expose `.env*` values.
- Keep provider and Supabase privileged credentials server-only.
- Revalidate authentication and room membership at every server and database boundary.
- Use allowlisted per-player projections and invalidation-only realtime events.
- Keep sensitive content out of URLs, storage, logs, analytics, traces, and error reports.
- Add nested `AGENTS.md` files when `src/ai`, `src/server`, `src/components`, `supabase`, or `e2e` become real ownership boundaries.
