# Whispers and Flames Project Status

This is the canonical handoff ledger for the fresh rebuild. Read this file before plans, branches, or chat history. The active ExecPlan remains the detailed implementation record; this file answers the shorter question: **where are we now?**

## Freshness record

- Last verified: 2026-07-20 20:50 EDT
- Verified by: live Git/worktree/remote state, draft PR #80, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, authenticated Jules CLI repository listing, controller syntax/self-tests, the historical demo plan, and three read-only privacy/server/AI, UI/accessibility, and verification/release audits
- Canonical rebuild worktree: `/Users/hbpheonix/whispersandflames-fresh`
- Integration branch: `fresh-main` at `e0be32d`; the matching remote branch exists
- Active delivery branch: `production/core-foundation`; frozen production-code base `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e`; the matching remote branch exists
- Active implementation state: no production code changes follow `a0cae22`; the user has authorized a time-boxed Jules capability trial whose two code outputs remain isolated review proposals unless root accepts them
- GitHub state: draft production PR [#80](https://github.com/Phazzie/WhispersAndFlames/pull/80) is open from `production/core-foundation` into `fresh-main`; it is a checkpoint, not release approval
- Deployment state: the fresh rebuild has not been deployed
- Active ExecPlan: `docs/PRODUCTION_CORE_EXEC_PLAN.md`
- Legacy checkout: `/Users/hbpheonix/whispersandflames`; it is not an implementation source for the rebuild

If the recorded branch, commit, worktree, PR, test, or deployment state disagrees with live evidence, update this file before doing substantial work.

## Plain-language status

The project is now pursuing **one production path**, not a demo release followed by a second production implementation. The existing local game flow is a prototype foundation: retain the useful server-owned state machine, privacy projections, AI separation, and interface, but replace temporary in-memory, polling, browser-token, and weak safety/recovery behavior as part of the production build. There will be no separate demo-polish, demo-deployment, or demo-release track.

Planning estimates, not coverage metrics:

| Milestone | Estimate | Meaning |
| --- | ---: | --- |
| Production behavior foundation | 55% | The complete happy path exists locally, but several trust boundaries and temporary adapters must be replaced rather than polished as a demo. |
| Production-ready core release | 25% | Safe matching, Supabase durability, database authorization, retention, reproducible proof, release hardening, and deployment remain. |
| Fresh rebuild deployed | 0% | The production branch and draft checkpoint PR now exist remotely, but no preview or production deployment exists. |

## Current direction: production only

Decision recorded 2026-07-20: do not finish and ship a separate demo. The dirty prototype tree was preserved as recoverable checkpoint `a0cae22`; every subsequent implementation outcome is a production-core slice. A repair is in scope only when it is required for the production product, the production migration, or trustworthy verification. Demo-only polish and temporary-adapter hardening that will be deleted during the production replacement are out of scope.

## What the urgent demo sprint was

On 2026-07-17, the user needed a presentable game quickly for an in-person guest. The sprint deliberately optimized for one cohesive, working local experience rather than production infrastructure.

Three implementation lanes ran in separate worktrees and were integrated onto `demo/guest-ready`:

1. A server-authoritative room engine and route handlers.
2. Separate Ember, match-analysis, and Scribe AI modules with OpenAI and deterministic fallbacks.
3. The complete responsive game interface and local session recovery.

The resulting demo supports:

- exactly two named adult players;
- room creation and six-character room joining;
- individually submitted category and intensity settings, with a known production blocker because the resulting question sequence/no-overlap behavior can still leak information by inference;
- a shared eight-question Ember arc;
- sealed answers and skips that never appear in the partner projection;
- sanitized shared-theme matching;
- private approve/pass ballots;
- discussion only after mutual approval and mutual readiness;
- a closing Scribe note based only on mutually approved sanitized themes;
- refresh recovery while the same server process remains alive;
- deterministic curated AI fallbacks when OpenAI is unavailable;
- responsive desktop and mobile presentation.

## Evidence already obtained

- The integrated unit suite reached 48 focused tests after correcting category matching to use only the players' actual overlap.
- A production build passed before the final scroll-restoration edit.
- A real two-browser run completed creation, joining, preferences, all eight questions, privacy checks, review, discussion, and Scribe.
- The browser run reported zero console errors and zero warnings.
- Desktop and 390-pixel mobile views were visually inspected.
- A synthetic answer unique to one browser was checked and did not appear in the partner snapshot.

This evidence is meaningful, but it is manual and partly stale. There is no committed Playwright spec in `e2e/`, the production build predates later edits, and checkpoint `a0cae22` has not passed one combined post-edit release gate. Do not treat the manual browser run as a reproducible acceptance test.

## Production prototype-foundation checkpoint

Commit `a0cae22` preserves the final prototype review batch in draft PR #80:

- true shared-category intersection and a private no-overlap retry state;
- tests for the no-overlap reset behavior;
- step-aware scroll restoration between game phases;
- security response headers and explicit Turbopack root configuration;
- removal of an obsolete temporary AI type shim;
- updated demo outcomes and evidence in the ExecPlan;
- generated `next-env.d.ts` required by the current Next.js setup.

This checkpoint is pushed and recoverable. It has not passed the combined production gate and carries the audit blockers below. Do not merge it merely because the branch and PR exist.

## Temporary prototype limitations to replace for production

- Rooms are stored in server memory and disappear whenever the Next.js process restarts.
- There is no Supabase Auth, Postgres persistence, Realtime invalidation, RLS, cleanup job, or retention enforcement yet.
- Synchronization uses short polling.
- Create and join do not yet have replay-safe operation IDs; in-room mutations do.
- Player tokens live in `sessionStorage` in the current prototype.
- The rebuild has a remote branch and draft checkpoint PR, but no preview or production deployment.
- The complete release security, accessibility, adversarial database, secret-scan, and deployment-smoke gates have not run.

These are production follow-ups. They do not invalidate the proven local product flow, but they prevent calling the rebuild released.

## Production-only remaining work checklist

This is one production roadmap. The existing flow is the starting foundation, not another product to finish first. The active production ExecPlan will contain implementation detail. Do not mark an item complete without recorded evidence.

### 0. Convert the prototype into a recoverable production starting point

- [x] Preserve and review the 12-path dirty integration batch as production prototype checkpoint `a0cae22`; do not treat that preservation commit as release approval.
- [x] Correct the demo ExecPlan's stale claims about committed browser proof, create/join operation IDs, AI interfaces, and current verification.
- [x] Turn the reviewed batch into one coherent recovery commit, rename/re-scope the delivery as production foundation work, push it, and open draft production PR #80.
- [ ] Keep one major implementation PR open at a time; no dependent local PR stack.

### 1. Repair production trust and correctness in the existing foundation

- [ ] Redesign preference resolution so question categories, intensity, and no-overlap behavior cannot reveal or probe the partner's private selections.
- [ ] Bind answer, ballot, ready, and other phase commands to the exact room version, question ordinal, or candidate the player saw; reject stale tabs and out-of-order requests.
- [ ] Make operation retries real: retain operation IDs across response loss, repair no-overlap idempotency, and add replay-safe create/join recovery.
- [ ] Replace token-overlap matching with evidence rules that reject aversion, discomfort, negation, coercion, opposite meanings, and unrelated homonyms.
- [ ] Constrain Scribe output to mutually approved sanitized themes; reject invented activities or unsupported details.
- [ ] Strengthen Ember validation for violence, unsafe breath play, intoxication, minors, coercion, euphemisms, category/intensity ceilings, and the required emotional arc.
- [ ] Enforce AI safety and privacy again at the `GameAiPort` repository boundary so a future provider cannot bypass validation.
- [ ] Remove player names from the Scribe provider contract; pass only approved sanitized theme data.
- [ ] Make Start over/Forget honest and safe: confirm destructive intent, cancel outstanding requests, prevent old-room responses from resurrecting/cross-wiring sessions, and distinguish local forgetting from server deletion.
- [ ] Handle unavailable `sessionStorage`, insecure-LAN UUID generation, clipboard failure, request timeouts, terminal polling errors, bounded backoff, and error recovery without consuming an unrecoverable room seat.
- [ ] Runtime-validate every successful server projection in the browser with the shared Zod contract.
- [ ] Disable or snapshot all editable controls while a preference/ballot mutation is in flight and prevent re-entrant submissions.
- [ ] Disclose the actual external AI provider/data boundary in consent copy and show the provider mode that is handling the current operation.
- [ ] Fix P1 accessibility defects: primary-button contrast, phase-change focus, screen-reader announcements, keyboard-safe copying, and the complete keyboard flow.

### 2. Build reproducible production proof alongside the repairs

- [ ] Commit a canonical Playwright test using two isolated browser contexts for create/join, all eight questions, zero-match and matched paths, private ballots, mutual approval, discussion, completion, refresh, response-loss recovery, and no-overlap retry.
- [ ] Assert in browser network, DOM, URL, and storage data that partner preferences, raw answers, skips, and ballots never cross the projection boundary.
- [ ] Add adversarial unit/integration tests for cross-room and invalid-token access, stale commands, concurrency, retries, AI timeout/refusal/malformed output, rollback, safety validation, and post-completion deletion.
- [ ] Add automated accessibility checks for every phase plus keyboard/focus and mobile projects.
- [ ] Test the OpenAI path with mocks for success, refusal, malformed output, abort, timeout, fallback, and `store:false`; keep a separate opt-in live-provider smoke test that never prints private payloads.
- [ ] Pin the supported Node/npm versions, prove `npm ci` from a clean checkout, generate Next types deterministically, and remove reliance on extraneous no-save browser packages.
- [ ] Resolve or explicitly disposition the moderate `next`/`postcss` audit finding without accepting npm's unsafe downgrade suggestion.
- [ ] Add deterministic format checking, informational coverage reporting, secret scanning, and runtime security-header assertions.
- [ ] Run and record the production-foundation gate: clean install, format, lint, typecheck, unit/integration/privacy/accessibility/E2E tests, audit disposition, secret scan, and production build.

### 3. Merge the production foundation PR completely

- [ ] Update this ledger, close the demo plan as historical, and record exact commands, date, commit/tree state, and results in the production plan.
- [ ] Push the verified head, make the draft PR ready, and require checks against that exact head SHA.
- [ ] Resolve every actionable review comment; require zero unresolved threads, no active changes-requested review, and fresh checks after the final commit.
- [ ] Merge into `fresh-main`, record the merge SHA, and delete or archive the delivery branch only after recovery evidence is preserved.

### 4. Replace temporary adapters and complete the production core

- [ ] Create and hostile-review the production ExecPlan before implementation; freeze the state machine, command errors, per-player projection, database/RLS matrix, realtime event, AI schemas, retention rules, fixtures, and acceptance tests.
- [ ] Implement Supabase Auth, Postgres persistence, atomic RPC/transaction boundaries, and per-request membership revalidation.
- [ ] Enable deny-by-default RLS on every gameplay table and prove cross-player/cross-room isolation with direct database attacks.
- [ ] Replace polling with invalidation-only Realtime events containing only session ID and version; authenticated clients refetch allowlisted snapshots.
- [ ] Implement immediate expiry denial, withdrawal/deletion, physical cleanup jobs, cleanup failure surfacing, and post-completion retention rules.
- [ ] Add room/create limits, request-body limits before expensive parsing, admission throttling, AI concurrency/cost budgets, and abuse/load tests.
- [ ] Add secure production session recovery without treating room codes or browser storage as authorization.
- [ ] Preserve separate versioned Ember and Scribe prompt modules with checksum/provenance tests and a deterministic scripted test provider.

### 5. Release and operate the production core

- [ ] Add required CI for clean install, format, lint, typecheck, unit, integration, RLS/privacy attacks, accessibility, two-context browser tests, audit/secret scan, and production build.
- [ ] Configure the deployment environment with server-only Supabase/OpenAI credentials, safe logging, CSP, HTTPS/HSTS, rate limits, and no sensitive analytics/tracing.
- [ ] Deploy a preview from the exact PR head, run two-player and failure-path smoke tests, then merge and deploy production from the recorded merge SHA.
- [ ] Prove the deployment serves the same verified SHA, run a live smoke without exposing private data, and record rollback instructions and evidence.

### 6. Install the delivery-control system after its pilot contract is corrected

- [x] Install and verify the official Jules CLI `v0.1.42` at `/Users/hbpheonix/.local/bin/jules` without requiring sudo.
- [x] Complete Google OAuth and prove the authenticated Jules account can list its connected repositories without printing credentials; `Phazzie/WhispersAndFlames` is available.
- [x] Create three exact-scope horizon packets plus `scripts/jules-lookahead.mjs`, which binds prompts to remote Git blobs, requires human-confirmed plan digests, records launches outside the worktree, and rejects wrong-base/change artifacts.
- [ ] Run the superseding three-mode Jules trial from the exact `production/core-foundation` source: one bounded Scribe privacy slice, one hostile read-only whole-code audit, and one substantial full-stack replay-safe command/stale-tab feature.
- [ ] Permit the two code trials to publish draft PRs targeting `production/core-foundation` for comparison; verify and disposition them promptly, never auto-merge them, and keep the audit session PR-free.
- [x] Define, commit, and push the three trial packets at source commit `950a6422afbcad4aa054dc87aac0ca6a46ada3c1`.
- [x] With explicit user authorization, delete all 61 sessions that were in `AWAITING_USER_FEEDBACK`; all 61 deletions succeeded. Preserve 378 completed, 18 failed, 2 paused, 2 in-progress, and 2 legacy records without state.
- [ ] Define the enforceable delivery states `DRAFT -> APPROVED -> IMPLEMENTING -> PR_OPEN -> REVIEW_CLEAN -> MERGED -> DEPLOYED -> VERIFIED -> CLOSED`, plus `BLOCKED` and `ABORTED` transitions.
- [ ] Define a schema-validated `DeliverySpec` with stable requirement/test IDs, non-goals, contracts, debt/waivers, PR order, deployment target, and unresolved unknowns.
- [ ] Bind approval to a protected-field digest, base SHA, critic/prompt/schema versions, verdict, finding dispositions, required checks, and waiver authority.
- [ ] Make one authoritative GitHub check reject scope drift, missing test mappings, unauthorized shortcuts, stale approval, unresolved review state, or incomplete closure; keep local hooks advisory.
- [ ] Use one available read-only critic per review: Antigravity when available, Jules as the independent Google-cloud fallback, or isolated Codex as the procedural fallback. Do not require all three.
- [ ] After the pilot proves useful, perform the planned architecture pass and separate deterministic policy from Codex, reviewer, Git, GitHub, CI, and deployment adapters.

### 7. Lower-priority polish after release blockers

- [ ] Stop unchanged one-second snapshots from rerendering the full experience and pause polling when appropriate.
- [ ] Clean up clipboard timers/pending states, sticky mobile submission behavior, overly chatty character-count announcements, tab Home/End behavior, error-dismissal focus, forced-colors selection states, placeholder contrast, and very small explanatory text.

## Exact next action

Commit and push the strengthened replay-safe command feature packet, then launch the deep read-only audit first with the exact branch/SHA stop check. Verify its source context before launching the bounded Scribe slice and full-stack feature. The two code results may become draft PRs against `production/core-foundation`, but no Jules result may merge or deploy without root review and verification.

Before cleanup, both the strict REST path and official CLI returned `FAILED_PRECONDITION` without creating a trial session. The repository source is healthy and advertises 46 branches including `production/core-foundation`. The leading explanation was stale concurrency because 61 sessions awaited feedback against Google's published Ultra ceiling of 60; all 61 exact-state sessions are now deleted, so the next audit launch will confirm or disprove that inference.

## Ledger update contract

The root integrator owns this file. Update it whenever any of these changes:

- active worktree, branch, or head commit;
- uncommitted work or its owner;
- milestone completion estimate;
- a verification result or known failure;
- PR, review, merge, or remote-branch state;
- preview or production deployment state;
- blocker, intentional limitation, or exact next action.

Use live evidence. Distinguish **implemented locally**, **verified locally**, **pushed**, **reviewed**, **merged**, and **deployed**. Record the date and commit for verification claims. Prefer updating this ledger in the same commit that changes project state.
