# WF-JULES-H2-PRIVACY-001 — Adversarial Privacy, Recovery, and Accessibility Test Oracle

## Assignment

Prepare the reusable adversarial proof design needed two slices from now. Produce test oracles, fixtures, and expected outcomes before implementation so later code cannot redefine success around itself. Do not write tests or production code yet because the production contract is not frozen.

- Repository: `Phazzie/WhispersAndFlames`
- Required starting branch: `production/core-foundation`
- Frozen production-code base SHA: `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e`
- Expected session-source SHA: root injects the resolved remote branch HEAD immediately before API launch
- Mode: read-only analysis; session response only
- Contract state: not frozen
- Automatic PR: forbidden

Before analysis, report the checked-out branch, `git rev-parse HEAD`, and `git status --porcelain=v1`; HEAD must exactly equal the expected session-source SHA injected above and the worktree must be clean. Prove `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e` is an ancestor and list every path changed after it. Only `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, `docs/jules/**`, and `scripts/jules-lookahead.mjs` may differ. If any check fails, if the repository is legacy `main`, or if current contract/repository files are absent, stop with `BASE_MISMATCH`. Never inspect `.env*` contents or print secrets, tokens, answers, or provider payloads.

Run these commands as separate shell invocations, spelled exactly. Run the first five before reading files beyond this packet; run the last two after the final response is prepared but before sending it. Do not combine them with shell operators:

    git branch --show-current
    git rev-parse HEAD
    git status --porcelain=v1
    git merge-base --is-ancestor a0cae22b228e2d0f655b37aa140bf3e0bd70b80e HEAD
    git diff --name-only a0cae22b228e2d0f655b37aa140bf3e0bd70b80e..HEAD

    git status --porcelain=v1
    git diff --exit-code

The controller validates the recorded command strings, exit codes, and outputs. A prose claim or copied JSON without matching command evidence is rejected.

## Read first

Read root `AGENTS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, every nested `AGENTS.md`, current contracts/repository/routes, AI matching and validation, every file under `src/components/game`, `src/app/layout.tsx`, `src/app/globals.css`, `playwright.config.ts`, and every current unit/browser test. Treat existing behavior as evidence, not authority where it conflicts with product invariants.

## Threats the oracle must cover

- preference reconstruction through category sequence, intensity, timing, error wording, or repeated no-overlap probes;
- cross-player/cross-room raw preferences, answers, skips, ballots, evidence, tokens, and provider payload leakage;
- stale tab, stale room version, wrong question/candidate, reordering, duplication, concurrent commands, and response-loss replay;
- create/join retry after a lost response, intended-player versus attacker join races, third-seat admission, room-code probing, and restart recovery;
- old snapshot/mutation responses arriving after forget, withdrawal, logout, room replacement, or a new session; cross-room/equal-version response confusion; refresh/history recovery; malformed successful projections; cancellation, timeout, terminal 401/404, offline/online, bounded backoff, throwing storage, insecure-origin UUID generation, clipboard failure, and edits/re-entrant actions while a mutation is pending;
- negation, aversion, discomfort, coercion, incompatible meaning, homonyms, fabricated common ground, unsafe Ember output, and invented Scribe content;
- zero-match completion, independent approval, withdrawal, expiry, deletion, AI timeout/refusal/malformed output, and rollback after failure;
- accessibility and recovery across every phase: WCAG AA contrast, keyboard-only completion, focus after local/partner phase changes and error dismissal, screen-reader announcements without per-keystroke chatter, reduced motion, forced colors, mobile layout, and keyboard-safe copy fallback;
- leakage through projections, ordinary HTTP request/response bodies and headers, redirects/referrers/cache/retries, error bodies, realtime events, DOM, URLs, browser storage, logs, traces, screenshots, videos, and normal test output. Use unique A/B sentinel values and per-context capture.

Use synthetic, non-graphic fixtures only. Never reproduce real or repository-secret content.

## Required result

Return one response with these exact sections:

- `BASE_EVIDENCE`: branch, full session-source SHA, frozen production-code base SHA, allowed control-only delta, clean-worktree evidence, inspected paths, and no-environment-read attestation.
- `ORACLE_ASSUMPTIONS`: facts already guaranteed by repository product invariants versus unresolved contract decisions. Unresolved semantics are blockers, never safe defaults.
- `REQUIREMENT_TEST_MAP`: stable requirement IDs `PRIV-NNN` mapped to stable test IDs. Each executable entry names layer (pure/unit, route/integration, direct database, accessibility, or two-context browser), setup, action/interleaving, allowed observation for player A and B, forbidden sentinel values, exact expected result/error already supported by a product invariant, and why a weaker assertion would miss the bug. A two-context test means separate browser contexts with independent cookies, storage, and request/response/event capture; two pages in one context is invalid.
- `DETERMINISTIC_FIXTURES`: minimal reusable rooms, identities, operations, questions, answers, candidates, clocks, provider scripts, and failure injectors. Use opaque labels and synthetic text.
- `CONCURRENCY_SCHEDULES`: deterministic barriers/interleavings for join, preferences/no-overlap, answer, ballot, ready, refresh/session replacement, realtime invalidation, withdrawal, expiry, and cleanup races.
- `PROJECTION_LEAKAGE_MATRIX`: every private field against every observable channel, including per-context HTTP requests/responses/events, headers, redirects, cache, aborted/retried traffic, DOM, URL, storage, logs, traces, and artifacts, with the negative assertion required.
- `ACCESSIBILITY_ORACLE`: stable all-phase contrast, keyboard, focus, announcement, reduced-motion, forced-colors, and mobile obligations plus the automated/manual proof boundary.
- `BLOCKED_ORACLES`: scenarios whose expected behavior depends on an unresolved freeze decision. State the decision and observable alternatives but do not select one.
- `TOP_TEN_FIRST`: the ten tests with the highest defect-detection value, ordered for Milestone 2.
- `CONTRACT_GAPS`: current interface fields/errors needed to make the oracle executable, with current file/line evidence.
- `NO_CHANGE_ATTESTATION`: include final `git status --porcelain=v1` and `git diff --exit-code` evidence, then confirm no files, branches, PRs, dependencies, settings, or deployments were changed.

Do not grade by coverage percentage or propose duplicate implementations. The output must be detailed enough that a later worker can implement the tests after freeze without deciding the product semantics.

End the same final response with exactly one machine-readable envelope. Copy the injected header values literally and use the exact changed-path array from `EXPECTED_CONTROL_DELTA_JSON`:

    <JULES_CONTROL_JSON>
    {
      "packetId": "WF-JULES-H2-PRIVACY-001",
      "packetBlobSha": "<PACKET_BLOB_SHA from control header>",
      "branch": "production/core-foundation",
      "sessionSourceSha": "<EXPECTED_SESSION_SOURCE_SHA from control header>",
      "productionCodeBaseSha": "a0cae22b228e2d0f655b37aa140bf3e0bd70b80e",
      "changedSinceCodeBase": ["<exact paths from EXPECTED_CONTROL_DELTA_JSON>"],
      "initialStatusPorcelain": "",
      "finalStatusPorcelain": "",
      "finalDiffExitCode": 0,
      "environmentValuesRead": false,
      "filesChanged": false,
      "branchesOrPrsCreated": false,
      "externalSettingsOrDeploymentsChanged": false
    }
    </JULES_CONTROL_JSON>

Do not put placeholder strings in the actual envelope. An incorrect, missing, or additional envelope makes the result unusable.

## Stop conditions

Stop if the base is wrong or the answer would require private/environment data. When an expected outcome depends on any unresolved product or engineering contract decision, put it under `BLOCKED_ORACLES`; do not invent semantics or turn a preference into test truth. Do not edit, commit, push, open a PR, merge, deploy, or alter settings.
