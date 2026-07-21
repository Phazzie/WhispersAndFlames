# Whispers and Flames Production Core ExecPlan

This is a living plan. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current while work proceeds. `PROJECT_STATUS.md` remains the short canonical handoff; this file owns the detailed production execution story.

## Purpose / Big Picture

Ship one privacy-first production application, not a demo followed by a rewrite. Preserve the already useful two-player product flow, then replace each temporary trust boundary with production behavior: durable authenticated rooms, atomic server-owned transitions, per-player database authorization, invalidation-only realtime updates, enforceable retention, defensive AI boundaries, accessible recovery, reproducible two-browser proof, and a deployment tied to a verified commit.

The user-visible outcome is that two adults can privately complete the full Whispers and Flames experience through refreshes, retries, server restarts, and normal network failure without either player learning the other's private choices, answers, skips, or ballots. Only a sanitized theme supported and independently approved by both players may enter discussion or Scribe. Zero matches remains a safe, successful result.

## Progress

- [x] (2026-07-20) Preserve prototype foundation commit `a0cae22`, push `fresh-main` and `production/core-foundation`, and open draft PR #80.
- [x] (2026-07-20) Record the production-only decision and close the demo sprint as historical rather than a second delivery track.
- [x] (2026-07-21) Launch all three Jules trial modes from exact production snapshot `8eeb1f7` through the temporary slash-free branch alias; all three corrected plans were reviewed and approved before implementation.
- [ ] Milestone 1: hostile-review and freeze the production contracts and acceptance map.
- [ ] Milestone 2: repair the domain/privacy/recovery behavior behind the existing adapter and prove it with deterministic tests.
- [ ] Milestone 3: replace process-local identity and storage with Supabase Auth, Postgres transactions/RPCs, and deny-by-default RLS.
- [ ] Milestone 4: add invalidation-only Realtime, expiry, withdrawal, physical cleanup, and cleanup-failure visibility.
- [ ] Milestone 5: harden provider adapters, prompts, schemas, and eval integration against the frozen repository acceptance boundary.
- [ ] Milestone 6: complete accessible client recovery, consent/provider disclosure, and two-context browser privacy proof.
- [ ] Milestone 7: install exact-head CI, review closure, preview/production deployment, live smoke, and rollback evidence.
- [ ] Run and disposition the user-authorized three-mode Jules capability trial: one bounded privacy slice, one hostile read-only audit, and one substantial replay-safe command/stale-tab feature.
- [ ] Close draft PR #80 only after deciding whether its large checkpoint diff is reviewable as the first production outcome or should be replaced by a clean, contract-frozen successor PR without creating a dependent PR stack.

## Surprises & Discoveries

- The prototype is farther along as a product experience than as a production system: the full local happy path exists, but persistence, authorization, retention, and reproducible browser proof do not.
- “Private preferences” are not currently private in the strong sense. The shared-category question sequence and no-overlap response can let one player probe the other's selections. Production preference resolution needs a non-oracular design, not just hidden response fields.
- Commands carry operation IDs but are not bound to the room version, question ordinal, or candidate the player actually saw. A stale tab can therefore apply intent to a later step.
- Current matching and Scribe validators are too lexical to enforce consent semantics. Provider structured output does not replace deterministic repository-boundary validation.
- The official Jules CLI can target a repository but does not expose an exact starting-branch flag. The REST API does expose `startingBranch`; the look-ahead experiment must use that path so it cannot silently analyze legacy `main`.
- The strict REST launch reached Jules but returned `FAILED_PRECONDITION` before creating a session. The authenticated CLI remains a useful independent launch surface, but its undocumented base selection must be verified rather than assumed.
- The CLI pilot returned the same `FAILED_PRECONDITION` before creating a session. The repository source is connected and advertises the required branch. An API-only aggregate found 61 sessions awaiting user feedback, 2 in progress, 2 paused, 378 completed, 18 failed, and 2 legacy records without state. Stale concurrency is the leading explanation because Ultra publishes a 60-task concurrent ceiling, but Jules did not provide enough error detail to call that cause proven.
- After the 61 waiting sessions were deleted, headless CLI creation succeeded. Jules correctly created its own isolated branch, but because `jules new --repo` exposes no starting-branch option, it based that branch on remote default `main` at `79dabd6`, not `production/core-foundation`. The first audit therefore stopped with `BASE_MISMATCH`. The original packet also incorrectly treated the expected `jules-*` output branch name as a mismatch; packets now validate the initial base HEAD instead of demanding the starting branch's name.
- The REST API accepted `main` and `fresh-main` as `startingBranch` values but returned `FAILED_PRECONDITION` for the slash-containing `production/core-foundation` branch. Temporary alias `jules-production-core-8eeb1f7` was therefore created at the exact same `8eeb1f7a7f943bff470cf6abab8f1af043dfc36d` commit. Current session artifacts independently report that exact `baseCommitId`; the alias changes no source code and will be deleted after generated PRs are safely retargeted.
- The read-only audit's disposable checkout acquired a `package-lock.json` diff during Jules environment setup despite an approved no-write plan. This did not touch the canonical worktree, but proves prompt-level read-only intent is not a technical sandbox. Root immediately instructed Jules to restore the file and will treat any non-clean final result as a failed scope-obedience score.

## Decision Log

- Decision: pursue one production path. The local prototype is a foundation to replace incrementally, not a separate demo to polish or deploy. Date: 2026-07-20.
- Decision: freeze cross-lane contracts before implementation waves. Root owns shared contracts, migrations, dependencies, root configuration, integration, PRs, and deployment. Date: 2026-07-20.
- Decision: keep at most one major implementation PR open. Jules look-ahead sessions are not a hidden dependent PR stack; until their contract is current, they produce analysis, test oracles, fixtures, and attack designs rather than mergeable feature code. Date: 2026-07-20.
- Decision: use a rolling three-horizon queue. While slice N is active, bounded sessions may prepare N+1, N+2, and N+3. Promotion requires matching base/contract metadata and root review. Date: 2026-07-20.
- Decision: initial Jules sessions are read-only, require exact source branch `production/core-foundation`, forbid automatic PRs, and may not inspect `.env*`. Date: 2026-07-20.
- Decision: supersede the initial all-read-only queue with a time-boxed three-mode capability trial requested by the user: bounded Scribe privacy implementation, hostile whole-repository audit, and a substantial full-stack replay-safe command/stale-tab feature. The two code sessions may publish draft evaluation PRs targeting `production/core-foundation`; they may never target `fresh-main`, merge, deploy, or silently expand scope. The audit remains read-only and creates no PR. Date: 2026-07-20.
- Decision: the feature trial must carry architectural weight. It spans command contracts, server idempotency ordering, exact step identity, API error behavior, client response-loss handling, and adversarial tests, while explicitly excluding create/join identity, Supabase, AI changes, dependencies, and release configuration. Date: 2026-07-20.
- Decision: a Jules-created PR is a review artifact, not an acceptance signal. Root must verify its base, owned paths, tests, privacy behavior, and review comments, then explicitly accept, repair, or close it. Temporary trial PRs do not authorize a dependent merge stack. Date: 2026-07-20.
- Decision: do not delete old Jules sessions merely to unblock the trial without the user's explicit permission. Session deletion removes external task history and is not implied by permission to launch new work. Date: 2026-07-20.
- Decision: Jules-owned branches and PRs are desirable isolation. The safety check applies to the commit from which Jules's branch starts, not the output branch's name. Do not use headless `jules new --repo` for non-default branches. Until the API accepts the slash-containing production name, launch through a uniquely named alias pinned to the exact production SHA, validate every returned `baseCommitId`, retarget PRs to `production/core-foundation`, then remove the alias. Date: 2026-07-21.
- Decision: tests are part of each slice rather than a postponed test phase. Each frozen requirement receives a stable ID and at least one named proof obligation before implementation begins. Date: 2026-07-20.

## Outcomes & Retrospective

No production milestone is complete yet. The branch and draft PR make the prototype recoverable; they do not make it production-ready. All three Jules trial modes are now running from exact source `8eeb1f7` under reviewed plans; none is accepted production work, merged, or deployed. The feature and bounded slice are producing isolated candidate patches, while the audit remains in progress after a disposable lockfile-mutation correction. Update this section after each disposition and merged milestone with the exact SHA, observable behavior gained, evidence run, remaining risk, and any change to the next slice.

## Context and Orientation

The canonical worktree is `/Users/hbpheonix/whispersandflames-fresh`. `fresh-main` is the integration branch. The active delivery branch is `production/core-foundation`, currently checkpointed at `a0cae22`. Draft PR #80 targets `fresh-main`.

The existing Next.js App Router application lives under `src/app`. Thin HTTP handlers are under `src/app/api`; the in-memory server-authoritative implementation is `src/lib/game/memory-repository.ts`; public request/result/projection schemas are in `src/lib/game/contracts.ts`; the replaceable game repository and AI ports are in `src/lib/game/repository.ts` and `src/lib/game/ports.ts`; provider-neutral AI behavior is under `src/lib/ai`; and the client flow is under `src/components/game`. `supabase/` does not exist yet. `e2e/` contains instructions but no canonical spec.

The permanent product rules come from root `AGENTS.md`: exactly two consenting adults, server-owned legal transitions, allowlisted personalized projections, no partner raw preferences/answers/skips/ballots, evidence from both players for every theme, independent approval before discussion, Scribe limited to approved sanitized themes, and valid zero-match completion.

The current repository contract names are useful discovery inputs, not yet frozen production interfaces. Milestone 1 may change them only through root-owned, explicitly reviewed edits.

## Plan of Work

### Milestone 1 — contract freeze and acceptance map

Create root-owned, versioned artifacts that define the production state machine, commands and stable public/internal errors, operation replay rules, principal/session/admission/recovery lifecycle, per-player projection, data classification/table/RLS matrix, authenticated RPC/transaction boundaries, invalidation event, retention/deletion state machine, external-AI data-egress and consent policy, AI ports and Zod schemas, safe logging/telemetry allowlist, UI view model/recovery rules, deterministic fixtures, requirement-to-test map, and release acceptance flow. Give every behavioral requirement and proof a stable ID. Include zero-match, stale-tab, response-loss, concurrent join, expiry, withdrawal, provider failure, cleanup failure, and restart behavior.

The external-AI policy must settle, per operation, whether raw answers or configuration may leave the application server; the minimum fields allowed to reach each provider; both-player disclosure/consent and withdrawal behavior; provider identity/mode visibility; verified provider storage/retention behavior; `store:false` or equivalent requirements; local/fail-closed behavior when consent or the provider is unavailable; and the prohibition on private data in logs, traces, errors, analytics, and test artifacts. Do not let “provider-neutral” hide a material data-egress decision.

Run a hostile read-only review of the complete freeze. Resolve every P0/P1 and explicitly accept, defer with authority, or fix every P2. Record a digest over protected contract fields and the base SHA; progress notes and evidence are not part of that digest.

### Milestone 2 — domain, privacy, and recovery

Implement the frozen pure transition rules before database coupling. Remove preference oracles; bind every command to expected version and step identity; make create, join, and in-room operations replay-safe after response loss; reject stale/out-of-order intent deterministically; implement pure evidence/consent rules for aversion, negation, coercion, opposition, unsupported homonyms, and approved-theme-only Scribe inputs; enforce those provider-independent acceptance rules at the repository boundary; and define honest withdrawal/forget semantics.

Keep a deterministic scripted provider for all automated paths. Add focused unit and adapter integration tests beside this work, including hostile provider and concurrency fixtures. Do not introduce Supabase in this milestone unless the contract review proves a domain behavior cannot be specified independently.

### Milestone 3 — Supabase identity, persistence, transactions, and RLS

Add the production Supabase boundary from the frozen schema: authenticated identities, room membership for exactly two adults, hashed/opaque join admission, durable state, atomic transition RPCs or transactions, lazy server-only privileged initialization, and per-request authorization. Enable RLS on every gameplay table and remove default client access to private rows. No room code or realtime subscription is authorization.

Write direct adversarial database tests before declaring the adapter complete: cross-room reads/writes, partner-private reads, forged membership, third-seat races, stale transition races, RPC privilege escalation, expired access, revoked access, and unauthenticated calls.

### Milestone 4 — realtime and lifecycle

Replace polling with Realtime messages containing only session ID and monotonically increasing version. Treat messages as invalidation signals; the client always refetches its authenticated allowlisted projection. Make expiry immediately deny access even before physical cleanup. Implement withdrawal, completion retention, idempotent physical deletion, bounded retries, dead-letter/failure surfacing, and operator-visible cleanup health without private payloads.

Test duplicate, missing, delayed, and out-of-order invalidations; restart recovery; cleanup retries; expired-token denial; and proof that realtime payloads never contain private values.

### Milestone 5 — AI safety and quality

Preserve Ember and Scribe as separately versioned prompt modules with checksum/provenance tests. Keep runtime context, schemas, safety constraints, and provider instructions separate from verbatim persona sources. Ember receives only the configuration allowed by the frozen egress/consent matrix and previous questions, never answers or ballots. Match receives only the matrix's minimum allowed evidence and emits only sanitized candidates. Scribe receives only mutually approved sanitized themes and no names. No adapter may silently widen those inputs.

Integrate the frozen provider-independent acceptance rules from Milestone 2; do not create a competing validator. Milestone 5 owns provider adapters, prompts, provider-facing schemas, provider-mode disclosure plumbing, and eval integration. Add provider-specific safety/privacy fixtures for coercion, violence, unsafe breath play, intoxication, minors, euphemisms, malformed output, timeout, refusal, storage flags, and provider unavailability. Keep live-provider smoke opt-in and free of private fixtures.

### Milestone 6 — accessible recovery and canonical browser proof

Replace browser bearer-token assumptions with the frozen authenticated recovery flow. Cancel or generation-guard outstanding requests so an abandoned room cannot resurrect or overwrite a new session. Runtime-validate every projection. Bound timeouts/backoff and terminate unrecoverable polling/realtime states. Make controls snapshot/disable consistently while submitting. Disclose the actual provider/data boundary and current provider mode. Fix contrast, focus on phase changes, live announcements, keyboard copying, and all-phase keyboard/mobile behavior.

Commit one canonical Playwright story with two isolated browser contexts. It must inspect DOM, URLs, network responses/events, and browser storage to prove partner-private values never arrive. It covers matched and zero-match paths, all eight questions, private ballots, mutual approval, refresh/recovery, stale commands, response loss, no-overlap behavior, expiry/withdrawal, and safe completion.

### Milestone 7 — release closure

Make CI run from a clean install with pinned Node/npm and deterministic generated types. Required checks cover format, lint, strict typecheck, unit/integration tests, direct RLS/privacy attacks, accessibility, two-context Playwright, dependency/audit disposition, secret scan, and production build. Checks and approval must apply to the exact current PR head.

Resolve every actionable review comment, reach zero unresolved threads and no active changes-requested review, and rerun checks after the final commit. Deploy a preview from that exact SHA, smoke two-player and failure paths, merge, deploy production from the recorded merge SHA, prove the served revision, run a privacy-safe live smoke, and record rollback. Only then mark the core release closed.

## Rolling Jules Look-Ahead Experiment

The experiment is meant to buy calendar time without buying duplicate code. A horizon session prepares a reusable artifact before its implementation slice arrives.

At most three Jules sessions may be active. `scripts/jules-lookahead.mjs` creates each session through the Jules `v1alpha` REST API with repository `Phazzie/WhispersAndFlames`, exact `startingBranch: production/core-foundation`, `requirePlanApproval: true`, and `automationMode` omitted so automatic PR creation stays disabled. Commit `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e` is the frozen production-code base. The branch may contain the later control-doc/controller commit; immediately before each POST, the controller resolves the remote branch head and injects that full expected session-source SHA into the prompt. The session must prove that exact clean HEAD and that every path since the code base is an allowed control artifact, or stop with `BASE_MISMATCH`.

Jules does not expose an API-enforced read-only sandbox, path policy, or exact starting-commit field. “Read-only” is therefore an intent guarded by the prompt and explicit plan approval, not a platform guarantee. The controller keeps all state/results under `.git/jules-lookahead`, never enables automatic PRs, and rejects a result containing a `changeSet`, forbidden write-oriented plan, missing required section, unknown critical API state/schema, or wrong source evidence. This prevents a cloud change from becoming repository work; it does not pretend the model was technically unable to edit its disposable clone.

The initial queue is:

1. Horizon +1: hostile production architecture and contract-freeze review (`docs/jules/HORIZON_1_ARCHITECTURE_REVIEW.md`).
2. Horizon +2: adversarial privacy, recovery, and accessibility test oracle (`docs/jules/HORIZON_2_PRIVACY_TEST_ORACLE.md`).
3. Horizon +3: Supabase RLS, realtime, retention, and cleanup attack design (`docs/jules/HORIZON_3_RLS_RETENTION_ATTACK_DESIGN.md`).

These sessions have read-only intent because the shared production contract is not frozen. Their initial results are advisory inputs only, not promotable implementation. They are not “work done” until root harvests them, verifies cited paths against the named base, resolves contradictions, and dispositions accepted items into the freeze. Once a contract is frozen, new implementation packets may bind its protected digest and work in isolated cloud branches, but only inside exact owned paths and never as an alternative implementation of active work. A pre-freeze result must be revalidated against the final digest; it can inform the contract but can never acquire implementation status retroactively.

Future implementation promotion requires all of: expected repository, injected session-source SHA, and production-code base SHA; exact protected-contract digest; packet ID; owned/prohibited paths; validation transcript; unresolved risks; no `.env*` access; no dependency/lockfile/migration/shared-contract changes outside root ownership; and root acceptance. A mismatch turns the result into advisory input, never a blind cherry-pick. The three initial pre-freeze packets are categorically ineligible for code promotion.

### Three-mode capability trial

On 2026-07-20 the user authorized a deliberately broader comparison instead of three similar advisory jobs. The trial packets are:

1. `docs/jules/TRIAL_1_BOUNDED_SCRIBE_SLICE.md`: one small, real privacy correction that removes names from the Scribe boundary.
2. `docs/jules/TRIAL_2_DEEP_CODE_AUDIT.md`: a hostile read-only search for concrete privacy, correctness, recovery, AI, accessibility, and proof defects.
3. `docs/jules/TRIAL_3_REPLAY_SAFE_COMMANDS_FEATURE.md`: a full-stack feature binding every in-room mutation to the observed room version and step, making exact retries idempotent after response loss, rejecting stale tabs and conflicting operation-ID reuse, and proving it across repository, API, and client tests.

This is an evaluation, not permission to bypass the contract freeze. The code outputs are isolated draft proposals targeting `production/core-foundation`. They become production work only after root verifies the exact base and scope, reviews every changed line, runs the required evidence, resolves conflicts with the freeze, and deliberately accepts them. A weak or stale proposal is closed rather than patched indefinitely. The audit never edits or publishes code.

The official CLI was used to test the simpler operator experience. Its headless `new` command has no documented branch flag and selected default `main` in the first pilot. The public API does expose `startingBranch`, but rejected the production branch's slash-containing name, so the current trial uses temporary alias `jules-production-core-8eeb1f7`, which resolves to the same exact source commit. Every packet receives the expected full SHA and checks the initial HEAD of Jules's own branch before work. No failed or ambiguous launch is blindly repeated.

## Concrete Steps

Run commands from `/Users/hbpheonix/whispersandflames-fresh` unless stated otherwise.

1. Verify the active checkpoint before contract work:

       git status --short --branch
       git rev-parse HEAD
       git ls-remote --heads origin fresh-main production/core-foundation

2. Draft the freeze artifacts and stable requirement/test IDs on `production/core-foundation`. Do not begin cross-lane implementation until the hostile review is resolved.

3. Preserve the strict REST controller as an experimental automation path, but do not expand it while its create-session call returns `FAILED_PRECONDITION`. Keep its API key outside the repository and never print it.

4. Completed: commit and push the packets, pin temporary alias `jules-production-core-8eeb1f7` to exact production SHA `8eeb1f7`, and launch the corrected audit. Validate the initial commit from Jules activity evidence rather than treating its generated branch name as a mismatch.

5. In progress: monitor the bounded slice, audit, and feature with bounded one-shot status/activity reads. For any code result, verify base, owned paths, tests, and diff; retarget any alias-based PR to `production/core-foundation` and make it draft before review. Record PR URLs, elapsed time, root correction/review time, accepted findings, and accept/repair/close disposition here; do not copy claims without checking cited paths.

6. Complete Milestone 1, revalidate every accepted H2/H3 item against the frozen digest, update `PROJECT_STATUS.md`, and decide the first reviewable production outcome for draft PR #80. Keep one major implementation PR open at a time.

7. For every later milestone: assign isolated work packets from the frozen contract, merge through root only, run lane tests plus global lint/typecheck after integration, run the milestone gate, clear review state, merge, update this plan and the ledger, then roll the three-horizon queue forward.

## Validation and Acceptance

Milestone 1 is accepted when a new agent can implement each lane without inventing a cross-lane interface, every requirement maps to a named proof, the hostile review has no unresolved P0/P1 and every P2 has a recorded disposition, and the protected contract digest/base SHA are recorded.

Milestones 2–6 are accepted only by observable tests of the behavior named in their sections, not by file presence. Every per-player privacy claim requires a negative assertion that the forbidden value is absent from projection, network, realtime, DOM, URL, storage, logs, traces, and test artifacts as applicable.

The production core is accepted only after this exact release family passes from a clean checkout at the final head: clean install, format check, lint, strict typecheck, deterministic unit/integration tests, direct RLS/privacy attacks, accessibility checks, two-context Playwright, dependency/audit disposition, secret scan, and production build. Preview and production smoke evidence must identify the deployed commit. No unresolved P0/P1, review thread, changes-requested review, cleanup failure, or undocumented waiver may remain.

The three-mode Jules trial is successful only if it gives a useful comparison, not merely three completed sessions. Score each result on base/scope obedience, correctness, privacy, test quality, review burden, elapsed time, and whether it is accepted, repaired, or discarded. The audit must yield verified non-duplicate findings; the slice must be small and mergeable after review; the feature must behave coherently rather than merely compile. Close rejected trial PRs so experimentation cannot become hidden PR debt.

## Idempotence and Recovery

The checkpoint commit and draft PR make the starting state recoverable. Do not rewrite or force-push shared remote history. If a contract changes materially, stop active implementation lanes at clean commits, update the protected contract and digest through root, hostile-review the change, then rebase or discard stale worker output explicitly.

The documented Jules create-session request does not expose an idempotency key. The controller records packet ID, expected source SHA, unique title, and launch-attempt time before every POST. After an ambiguous timeout or response loss it lists/reconciles sessions for that exact title before deciding whether to retry; it never blindly re-POSTs. If duplicates appear, do not approve either until reconciled. Jules documents session deletion but not active-session cancellation guarantees, so deletion is cleanup rather than proof that compute stopped. Polling/paginated activity reads are safe to retry. A failed or malformed horizon result remains advisory and may be rerun once with a corrected, newly identified packet revision.

The CLI trial follows the same no-blind-retry rule. Before launch, list existing sessions for the unique packet ID. After any error, reconcile the remote list before retrying. A `BASE_MISMATCH` result is evidence that headless CLI branch selection is unsuitable; do not ask the session to work around it or treat code from another base as promotable.

The controller pins the current documented `v1alpha` state set and critical response fields as checked on 2026-07-20. It tolerates unknown non-critical fields but fails closed on missing/mistyped critical fields, unknown session states, non-JSON responses, or unexpected result artifacts. Recheck the official schema before changing the controller or after a schema-drift failure.

Database migrations must be forward and rollback aware. Destructive schema/data actions require explicit backups or disposable test environments and root authorization. Cleanup/deletion tests use synthetic fixtures only. Deployment rollback uses the last recorded verified production revision; do not infer it from a mutable branch name.

## Artifacts and Notes

- Production prototype checkpoint: `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e`.
- Draft checkpoint PR: https://github.com/Phazzie/WhispersAndFlames/pull/80.
- Historical sprint record: `docs/DEMO_SPRINT_EXEC_PLAN.md` (superseded; not an active delivery plan).
- Initial Jules packet IDs: `WF-JULES-H1-ARCH-001`, `WF-JULES-H2-PRIVACY-001`, and `WF-JULES-H3-DATA-001`.
- Three-mode trial packet/session IDs: replacement bounded slice `WF-JULES-TRIAL-SLICE-002` / `11259483656580049044`; corrected audit `WF-JULES-TRIAL-AUDIT-002` / `4328476836767870128`; feature `WF-JULES-TRIAL-FEATURE-001` / `5984020699228841651`.
- Jules audit pilot session: `15263271724263973882`. It completed without auditing after reporting `BASE_MISMATCH`: headless CLI based its Jules-owned branch on default `main` at `79dabd66e5d4afe5be5c2b875fe7d791d8af850b` instead of expected production source. No changes, output artifact, branch publication, or PR resulted.
- Current trial launch base: temporary alias `jules-production-core-8eeb1f7`, exactly equal to `production/core-foundation` at launch SHA `8eeb1f7a7f943bff470cf6abab8f1af043dfc36d`. Audit and feature activity artifacts report that exact base. Trial PR URLs: none yet.
- Frozen contract digest: not yet created; Milestone 1 output.
- Release merge SHA and deployment evidence: not yet available.

## Interfaces and Dependencies

The production contract freeze must define, at minimum:

- A pure `GameState` plus `GameCommand`/`GameResult` transition boundary with expected room version and step identity on every mutation, stable typed errors, and replay records keyed to authenticated player plus operation ID.
- A discriminated, versioned `PlayerProjection` built only from allowlisted fields. It never contains partner preferences, answers, skips, ballots, evidence, tokens, or provider payloads.
- A `GameStore`/transaction port whose implementation can atomically authenticate membership, lock/read state, apply one legal transition, persist replay result, increment version, and return one player's projection.
- A `RealtimeInvalidation` containing only opaque session identifier and version.
- Separate versioned `EmberPort`, `MatchPort`, and `ScribePort` inputs/outputs. Scribe input contains only mutually approved sanitized themes. All outputs cross Zod plus deterministic safety/privacy/evidence validation.
- A versioned `PrincipalSession`/`RoomAdmission`/`Recovery` boundary covering actor identity, both-adult consent, credential delivery and storage, room membership, join-secret lifecycle, replay-key ownership, revocation/withdrawal, refresh/restart recovery, and the rule that room codes cease to authorize after admission.
- A versioned external-provider egress matrix for Ember, Match, and Scribe that allowlists fields, consent state, provider mode, verified storage/retention setting, unavailable/withdrawn behavior, and prohibited logs/telemetry. No provider adapter may widen it.
- A safe observability boundary that allowlists event names and non-sensitive fields, separates public stable errors from private internal diagnostics, redacts by construction, and exposes cleanup/provider health without payload content.
- A retention policy interface that defines active expiry, withdrawal, completion retention, physical deletion, retry, and surfaced failure states.
- A deterministic fixture catalog shared by unit, database, and browser proof without containing real user content.

Launch dependencies are Next.js App Router with strict TypeScript, Supabase Auth/Postgres/Realtime, a provider-neutral AI boundary with OpenAI as launch provider, Zod runtime schemas, Vitest deterministic tests already configured in the repository, and Playwright with two isolated browser contexts. Root alone may add or change dependencies, lockfiles, migrations ordering, root configuration, shared contracts, CI, or deployment settings.
