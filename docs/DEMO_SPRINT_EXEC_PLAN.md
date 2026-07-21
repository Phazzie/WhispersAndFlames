# Guest-Ready Demo Sprint

This plan follows `.agent/PLANS.md` and is a living document.

> **Superseded on 2026-07-20.** The project will not finish or ship a separate demo. The code and manual evidence produced here are a prototype foundation for the single production path. Unresolved privacy, correctness, accessibility, verification, persistence, and release work moves into the production roadmap in `PROJECT_STATUS.md` and the forthcoming production ExecPlan. This historical plan must not be used to justify a demo-only PR or deployment.

## Purpose / Big Picture

Build a polished local demo that two isolated browsers can complete today. One player creates a room, shares a six-character code, and a second player joins. Both select shared preferences, answer the same eight Ember-style questions privately, review only sanitized themes supported by both answers, privately approve or pass, discuss mutually approved sparks, and receive a Scribe closing note. The flow must remain usable when OpenAI is unavailable through deterministic curated fallbacks.

## Progress

- [x] Create `demo/guest-ready` from the clean `fresh-main` history.
- [x] Scaffold a current patched Next.js App Router application and freeze shared contracts.
- [x] Implement the server-authoritative in-memory demo room engine and route handlers.
- [x] Implement provider-neutral Ember, match-analysis, and Scribe ports with OpenAI and fallbacks.
- [x] Implement the responsive full-game interface and local session recovery.
- [x] Manually exercise the complete path in two isolated browser contexts and obtain pre-final unit/build evidence.
- [ ] Resolve the July 20 privacy, stale-command, AI-safety, recovery, accessibility, and verification audit blockers recorded in `PROJECT_STATUS.md`.
- [ ] Commit the canonical two-context Playwright proof and the missing adversarial boundary tests.
- [ ] Run the complete post-repair clean-install and release gate on one exact tree.
- [ ] Commit, push, and open one meaningful PR into `fresh-main`.

## Surprises & Discoveries

- The clean worktree intentionally contains no framework scaffold or implementation code.
- A usable ignored `OPENAI_API_KEY` is already present and was explicitly preserved for this rebuild.
- Supabase durability is not yet provisioned in this clean worktree, so the guest demo uses an explicit in-memory adapter behind a server-owned repository interface. A server restart clears rooms.
- The machine's shared npm cache is unreliable. A project-local install succeeded through an isolated temporary cache, and browser proof used a no-save local Playwright CLI after bounded wrapper retries.
- The first integrated server draft resolved category selections as a union while the UI promised overlap. Integration review changed this to a real intersection and added a private no-overlap reset state.
- Real-browser phase transitions retained the prior screen's scroll position. The client now returns to the top only when the meaningful game step changes.
- Three read-only audits on 2026-07-20 found no P0 emergency, but they did find release-blocking privacy inference, stale-command, AI evidence/safety, lifecycle recovery, accessibility, and reproducibility gaps. Manual happy-path completion is therefore evidence of a functional flow, not proof that the branch is guest-ready.

## Decision Log

- Decision: build only in `/Users/hbpheonix/whispersandflames-fresh`; legacy and archived worktrees are not code sources.
- Decision: use one cohesive demo branch and one PR, with parallel agent work isolated in worktrees.
- Decision: use short polling for synchronization. It is reliable across isolated browsers and keeps the later Supabase Realtime replacement behind the API boundary.
- Decision: use opaque per-player bearer tokens in `sessionStorage`; invite codes are entered manually and no raw answer appears in URLs or player projections.
- Decision: default AI calls to the OpenAI Responses API through a lazy server-only client and structured outputs. Every AI operation has a curated deterministic fallback.
- Decision: preserve `AI_PERSONAS.md` and `aiprompting.md` verbatim. Runtime prompts load their intent through dedicated prompt builders rather than flattening Ember into generic copy.
- Decision: category resolution is the ordered intersection of both private selections. If it is empty, both selections are cleared, neither list is revealed, and both players receive the same retry reason.
- Decision: on 2026-07-20, stop treating the guest demo as a separate deliverable. Reuse its production-appropriate behavior as a prototype foundation and pursue only the production release path.

## Outcomes & Retrospective

The branch now contains a complete manual local game flow, not a shell. Two named, isolated browser contexts created and joined one room, selected overlapping private preferences, received the same eight-question Ember arc, proved that a synthetic private answer never appeared in the partner snapshot, advanced only after both submissions, privately approved a sanitized shared theme, gated discussion on both ready signals, and received the same Scribe afterglow. Both desktop and 390px screenshots were visually inspected. Browser consoles reported zero errors and zero warnings. The suite reached 48 focused tests after the no-overlap correction, and a production build completed before later edits.

That manual result is not a release gate. No Playwright spec is committed, the combined suite/build has not run on the current dirty tree, and the July 20 audits found material defects that can leak preference information, misapply stale commands, accept unsupported AI themes, mishandle recovery, and fail accessibility requirements. The ordered remediation and production backlog lives in `PROJECT_STATUS.md`. Rooms also remain process-local; create/join lack replay-safe operation IDs; Supabase durability and remote deployment are not part of this demo branch.

## Context and Orientation

`src/app` owns pages and route handlers. `src/components/game` owns the client experience. `src/lib/game` owns contracts, projections, and the in-memory repository. `src/lib/ai` owns provider-neutral ports, OpenAI implementations, and fallbacks. Tests live beside pure modules plus `e2e` for browser proof. The browser polls a single allowlisted snapshot endpoint; it never computes authoritative phase transitions.

The demo phases are `lobby`, `preferences`, `questions`, `review`, `discussion`, and `complete`. A room has exactly two seats. Each player receives their own answer status plus partner completion booleans, never the partner's raw content. Match candidates contain a short theme and discussion prompt with no quotes, attribution, or source answers. Only approve/approve candidates advance. Scribe sees those approved candidate objects only.

## Plan of Work

First create the fresh framework and typed request/snapshot contracts. Then implement a process-local repository with atomic synchronous mutations and allowlisted player projections. Route handlers validate bodies with Zod and translate domain errors into stable JSON responses. Next implement AI ports: Ember generates a complete eight-question arc, the analyst returns up to four sanitized shared themes, and Scribe creates the closing note. AI failures fall back without blocking the game. Finally implement a mobile-first visual flow with clear waiting states, progress, copyable room code, private answer affordances, match ballots, discussion ready gates, and a complete-state reset.

## Concrete Steps

From `/Users/hbpheonix/whispersandflames-fresh`:

1. Scaffold Next.js with TypeScript, App Router, Tailwind, ESLint, and npm. Add `zod`, `openai`, Vitest, Testing Library, and Playwright.
2. Add nested `AGENTS.md` files under each real ownership boundary before parallel edits.
3. Commit the foundation, create three worker branches/worktrees, and assign non-overlapping server, AI, and UI paths.
4. Integrate worker commits into `demo/guest-ready`, resolve only at shared contracts, and run targeted tests.
5. Start the app on an available local port, run two-browser Playwright proof, then run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` once at the boundary.

## Validation and Acceptance

Acceptance requires all of the following on the same recorded commit/tree:

- Two independent browser contexts create and join the same room with different player tokens.
- They see the same question ordinal/text, can submit independently, and neither snapshot contains the partner's answer.
- The second submission advances both players without a refresh beyond bounded polling.
- Eight questions lead to sanitized review candidates or the valid zero-match path.
- A candidate enters discussion only after both approve it.
- The complete view contains a warm Scribe note based only on approved sanitized themes.
- Refresh restores a player's room from `sessionStorage` while the dev server remains alive.
- OpenAI failure leaves the full game completable through fallback content.
- Preference and intensity choices cannot be reconstructed through projected categories, question text, retry states, or repeated probing.
- Stale, duplicate, concurrent, response-lost, and cross-room commands fail or replay safely without advancing the wrong step.
- Ember, matching, and Scribe reject the hostile cases catalogued in `PROJECT_STATUS.md` and expose no unsupported private evidence.
- A committed Playwright test reproduces the two-context flow and asserts private data absence in network, DOM, URL, and browser storage.
- The clean-install lint, typecheck, unit/integration/privacy/accessibility/E2E, audit/secret-scan, and production-build gate succeeds.

## Idempotence and Recovery

Answer, ballot, and ready operations currently use client-generated operation IDs, but the browser does not yet retain them across response loss and create/join do not carry replay-safe IDs. The repaired design must bind every in-room command to the exact version, ordinal, or candidate the player saw, retain an operation ID until success is known, and make create/join recoverable. A page refresh reuses the saved room ID and player token while the same server process remains alive. A server restart intentionally clears the demo store. Worker work remains recoverable as separate commits and worktrees. Failed AI calls are bounded and use deterministic fallbacks.

## Artifacts and Notes

Keep screenshots and traces only on browser-test failure. Do not commit `.env.local`, Playwright artifacts, or generated build output. The final handoff must include the branch, commit, PR URL if opened, local start command, demo limitation, and verification evidence.

## Interfaces and Dependencies

The browser talks only to `/api/rooms`, `/api/rooms/join`, `/api/rooms/[roomId]`, and phase-specific mutation endpoints. Every request after create/join sends `Authorization: Bearer <playerToken>`. Route handlers call a `GameRepository` interface. The initial `MemoryGameRepository` is a global lazy singleton for development. AI behavior currently crosses one `GameAiPort` with separate question, matching, and summary methods; the implementation keeps Ember and Scribe prompt modules separate and selects OpenAI when configured or deterministic fallbacks otherwise. The repository boundary must independently validate every provider result. `OPENAI_API_KEY` and `OPENAI_MODEL` are server-only.
