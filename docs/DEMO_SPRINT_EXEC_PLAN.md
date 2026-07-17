# Guest-Ready Demo Sprint

This plan follows `.agent/PLANS.md` and is a living document.

## Purpose / Big Picture

Build a polished local demo that two isolated browsers can complete today. One player creates a room, shares a six-character code, and a second player joins. Both select shared preferences, answer the same eight Ember-style questions privately, review only sanitized themes supported by both answers, privately approve or pass, discuss mutually approved sparks, and receive a Scribe closing note. The flow must remain usable when OpenAI is unavailable through deterministic curated fallbacks.

## Progress

- [x] Create `demo/guest-ready` from the clean `fresh-main` history.
- [ ] Scaffold a current patched Next.js App Router application and freeze shared contracts.
- [ ] Implement the server-authoritative in-memory demo room engine and route handlers.
- [ ] Implement provider-neutral Ember, match-analysis, and Scribe ports with OpenAI and fallbacks.
- [ ] Implement the responsive full-game interface and local session recovery.
- [ ] Prove the complete path with unit tests, production build, and two isolated browser contexts.
- [ ] Commit, push, and open one meaningful PR into `fresh-main`.

## Surprises & Discoveries

- The clean worktree intentionally contains no framework scaffold or implementation code.
- A usable ignored `OPENAI_API_KEY` is already present and was explicitly preserved for this rebuild.
- Supabase durability is not yet provisioned in this clean worktree, so the guest demo uses an explicit in-memory adapter behind a server-owned repository interface. A server restart clears rooms.

## Decision Log

- Decision: build only in `/Users/hbpheonix/whispersandflames-fresh`; legacy and archived worktrees are not code sources.
- Decision: use one cohesive demo branch and one PR, with parallel agent work isolated in worktrees.
- Decision: use short polling for synchronization. It is reliable across isolated browsers and keeps the later Supabase Realtime replacement behind the API boundary.
- Decision: use opaque per-player bearer tokens in `sessionStorage`; invite codes are entered manually and no raw answer appears in URLs or player projections.
- Decision: default AI calls to the OpenAI Responses API through a lazy server-only client and structured outputs. Every AI operation has a curated deterministic fallback.
- Decision: preserve `AI_PERSONAS.md` and `aiprompting.md` verbatim. Runtime prompts load their intent through dedicated prompt builders rather than flattening Ember into generic copy.

## Outcomes & Retrospective

Pending. Record the final working behavior, limitations, commands, and evidence here before handoff.

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

Acceptance requires all of the following:

- Two independent browser contexts create and join the same room with different player tokens.
- They see the same question ordinal/text, can submit independently, and neither snapshot contains the partner's answer.
- The second submission advances both players without a refresh beyond bounded polling.
- Eight questions lead to sanitized review candidates or the valid zero-match path.
- A candidate enters discussion only after both approve it.
- The complete view contains a warm Scribe note based only on approved sanitized themes.
- Refresh restores a player's room from `sessionStorage` while the dev server remains alive.
- OpenAI failure leaves the full game completable through fallback content.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` succeed.

## Idempotence and Recovery

Create, join, answer, ballot, and ready operations use client-generated operation IDs. The repository caches completed operation IDs per room so browser retries return the current view without duplicating state. Submissions are immutable within an ordinal. A page refresh reuses the saved room ID and player token. A server restart intentionally clears the demo store; the landing page explains this local-demo limit. Worker work remains recoverable as separate commits and worktrees. Failed AI calls are bounded and immediately use deterministic fallbacks.

## Artifacts and Notes

Keep screenshots and traces only on browser-test failure. Do not commit `.env.local`, Playwright artifacts, or generated build output. The final handoff must include the branch, commit, PR URL if opened, local start command, demo limitation, and verification evidence.

## Interfaces and Dependencies

The browser talks only to `/api/rooms`, `/api/rooms/join`, `/api/rooms/[roomId]`, and phase-specific mutation endpoints. Every request after create/join sends `Authorization: Bearer <playerToken>`. Route handlers call a `GameRepository` interface. The initial `MemoryGameRepository` is a global lazy singleton for development. AI code exposes `QuestionWeaver`, `MatchAnalyst`, and `Storyteller` interfaces; server orchestration selects OpenAI when configured and fallbacks otherwise. `OPENAI_API_KEY` and `OPENAI_MODEL` are server-only.
