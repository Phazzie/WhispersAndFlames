# WF-JULES-H1-ARCH-001 — Production Architecture Hostile Review

## Assignment

Perform a read-only hostile review that helps the root integrator freeze the production architecture one slice from now. This is not an implementation contest and not a request for alternate code.

- Repository: `Phazzie/WhispersAndFlames`
- Required starting branch: `production/core-foundation`
- Frozen production-code base SHA: `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e`
- Expected session-source SHA: root injects the resolved remote branch HEAD immediately before API launch
- Mode: read-only analysis; session response only
- Contract state: not frozen
- Automatic PR: forbidden

Before analysis, report the checked-out branch, `git rev-parse HEAD`, and `git status --porcelain=v1`; HEAD must exactly equal the expected session-source SHA injected above and the worktree must be clean. Prove `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e` is an ancestor and list every path changed after it. Only `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, `docs/jules/**`, and `scripts/jules-lookahead.mjs` may differ. If any check fails, if the repository is legacy `main`, or if the named files do not exist, stop with `BASE_MISMATCH`. Never inspect `.env*` contents or print credentials.

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

Read root `AGENTS.md`, `.agent/PLANS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, the nearest nested `AGENTS.md` files, `src/lib/game/contracts.ts`, `src/lib/game/ports.ts`, `src/lib/game/memory-repository.ts`, `src/lib/game/repository.ts`, `src/lib/ai/**`, `src/app/api/**`, `src/components/game/use-room-session.ts`, and existing focused tests. The historical demo plan may explain provenance but is not a production contract.

## Product invariants

Exactly two consenting adults participate. The server owns legal state transitions. A player never receives the partner's raw preferences, answers, skips, ballot, or match evidence. A theme exists only with evidence from both players and is discussable only after independent approval by both. Approval is willingness to discuss, not consent to act. Scribe receives only mutually approved sanitized themes. Zero matches is valid. Fail closed.

## Questions to answer

1. What cross-lane contracts must be frozen before domain, Supabase, AI, UI, and E2E work can safely run in parallel?
2. Where does the proposed milestone order permit semantic drift, privacy leakage, non-atomic transitions, or hard-to-reverse coupling?
3. Which current interfaces should be kept, split, replaced, or explicitly prohibited, and why?
4. What observable acceptance behavior and stable errors are missing for stale tabs, response loss, concurrent join, restart, expiry, withdrawal, cleanup failure, provider failure, and zero matches?
5. What principal/session/admission/recovery contract must be frozen before replay and command semantics can be implemented without temporary-token coupling?
6. What external-AI egress/consent contract must be frozen for Ember, Match, and Scribe, including raw-answer/configuration fields, provider identity/mode, both-player consent and withdrawal, provider storage/retention, logging prohibition, and fail-closed/local behavior?
7. What safe observability contract separates public errors, internal diagnostics, and operator health without leaking private state?
8. What is the smallest first production implementation outcome that is independently reviewable and mergeable without creating a dependent PR stack?

## Required result

Return one response with these exact sections:

- `BASE_EVIDENCE`: branch, full session-source SHA, frozen production-code base SHA, allowed control-only delta, clean-worktree evidence, inspected paths, and confirmation no environment values were read.
- `VERDICT`: `FREEZE`, `REVISE`, or `BLOCKED`, with one paragraph.
- `FINDINGS`: prioritized P0–P3. Each finding needs stable ID `ARCH-NNN`, confidence, current file/line evidence, failure scenario, contract change, and named proof obligation.
- `FREEZE_MANIFEST`: exact artifacts/fields/interfaces/errors that root must freeze, including state/commands, principal/session/admission/recovery, external-provider egress/consent, data/RLS/retention, observability, ownership, and dependency edges.
- `FIRST_PRODUCTION_SLICE`: one outcome, owned paths, prohibited paths, prerequisites, tests, stop conditions, and merge evidence.
- `OPEN_QUESTIONS`: only decisions that genuinely require user/product authority; do not hide engineering decisions here.
- `NO_CHANGE_ATTESTATION`: include final `git status --porcelain=v1` and `git diff --exit-code` evidence, then confirm no files, branches, PRs, dependencies, settings, or deployments were changed.

Do not offer alternative implementations unless comparing them is necessary to expose a contract decision; in that case recommend one and explain the rejection criterion in at most three sentences.

End the same final response with exactly one machine-readable envelope. Copy the injected header values literally and use the exact changed-path array from `EXPECTED_CONTROL_DELTA_JSON`:

    <JULES_CONTROL_JSON>
    {
      "packetId": "WF-JULES-H1-ARCH-001",
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

Stop without continuing if the base is wrong, an answer requires environment values, the task would require editing, or current repository evidence cannot support a conclusion. Do not create a plan that includes editing, committing, pushing, opening a PR, merging, deploying, or changing GitHub/Jules settings.
