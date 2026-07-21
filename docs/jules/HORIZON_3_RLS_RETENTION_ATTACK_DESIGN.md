# WF-JULES-H3-DATA-001 — Supabase RLS, Realtime, Retention, and Cleanup Attack Design

## Assignment

Prepare the data-boundary attack design needed three slices from now. The goal is to make the future Supabase implementation prove isolation, atomicity, invalidation privacy, and deletion rather than merely claim them. Do not write migrations or application code before the production schema/contract freeze.

- Repository: `Phazzie/WhispersAndFlames`
- Required starting branch: `production/core-foundation`
- Frozen production-code base SHA: `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e`
- Expected session-source SHA: root injects the resolved remote branch HEAD immediately before API launch
- Mode: read-only analysis; session response only
- Contract state: not frozen
- Automatic PR: forbidden

Before analysis, report the checked-out branch, `git rev-parse HEAD`, and `git status --porcelain=v1`; HEAD must exactly equal the expected session-source SHA injected above and the worktree must be clean. Prove `a0cae22b228e2d0f655b37aa140bf3e0bd70b80e` is an ancestor and list every path changed after it. Only `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, `docs/jules/**`, and `scripts/jules-lookahead.mjs` may differ. If any check fails, if the repository is legacy `main`, or if current product-contract files are absent, stop with `BASE_MISMATCH`. Never inspect `.env*`, Supabase credentials, provider credentials, or live project data. Do not connect to or change any Supabase project.

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

Read root `AGENTS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, game contracts/ports/repository, API route boundaries, client session synchronization, all nested instructions, and existing privacy tests. There is no production `supabase/` implementation yet; absence is expected and is not permission to invent unreviewed migrations.

## Design targets

- exactly two authenticated room members, equal authority after joining, and no room-code authorization after admission;
- atomic server-owned transitions, monotonic version, stale-command rejection, and replay-safe operation results;
- no direct access to partner-private rows or raw evidence through tables, views, functions, joins, error detail, replication, or Realtime;
- invalidation-only Realtime payload: opaque session ID plus version, followed by authenticated projection refetch;
- immediate access denial at expiry/withdrawal, followed by idempotent physical deletion with bounded retry and visible non-sensitive failures;
- zero-match and completion states that retain no more data than the frozen policy permits;
- lazy server-only privileged access and per-request revalidation; service-role credentials never enter a client/test artifact.

## Required result

Return one response with these exact sections:

- `BASE_EVIDENCE`: branch, full session-source SHA, frozen production-code base SHA, allowed control-only delta, clean-worktree evidence, inspected paths, confirmation no environment/live data was accessed.
- `DATA_CLASSIFICATION`: proposed entity/field classes (public-to-member, self-private, joint-sanitized, server-only, ephemeral-secret, deletion-metadata) with prohibited consumers and retention class. Do not finalize names as migrations.
- `MINIMUM_SCHEMA_SHAPE`: conceptual tables/keys/constraints/indexes and transaction boundaries needed to satisfy the invariants, clearly marking every unresolved contract dependency.
- `RLS_GRANT_MATRIX`: actor versus select/insert/update/delete/execute for every conceptual entity/function, default deny, and the narrow reason for each grant.
- `RPC_ATOMICITY_MATRIX`: each command, authenticated preconditions, rows locked, expected version/step, replay behavior, state writes, projection result, stable error, and rollback expectation.
- `ATTACK_CATALOG`: stable IDs `DATA-NNN`, severity, direct SQL/API setup and action, expected denial/result, forbidden sentinel, and which bad policy/implementation it catches. Include cross-room, partner-private, forged JWT claims, SECURITY DEFINER/search-path, function grants, third-seat races, stale races, operation replay, expired/withdrawn access, and cleanup races.
- `REALTIME_PROOF`: publication/filter design constraints plus tests for payload fields, unauthorized subscription, duplicate/missing/out-of-order events, and authenticated refetch.
- `RETENTION_STATE_MACHINE`: lifecycle states, clock source, immediate-denial predicate, cleanup ownership, retry/backoff, idempotence key, failure surfacing, and proof of physical deletion.
- `LOCAL_TEST_HARNESS`: how later workers can run synthetic direct-RLS tests in a disposable local environment without secrets or production data; identify root-owned config/dependency needs but do not change them.
- `FREEZE_BLOCKERS`: decisions root must settle before migrations, ordered by blast radius.
- `NO_CHANGE_ATTESTATION`: include final `git status --porcelain=v1` and `git diff --exit-code` evidence, then confirm no files, branches, PRs, migrations, dependencies, settings, services, or deployments were changed.

Recommend one coherent design. Do not generate two competing schemas. Use official Supabase/Postgres behavior only when confident; mark claims needing current documentation verification rather than guessing.

End the same final response with exactly one machine-readable envelope. Copy the injected header values literally and use the exact changed-path array from `EXPECTED_CONTROL_DELTA_JSON`:

    <JULES_CONTROL_JSON>
    {
      "packetId": "WF-JULES-H3-DATA-001",
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

Stop if the base is wrong, any step would require credentials or live infrastructure, or schema choice depends on an unresolved product policy. Record the blocker rather than inventing it. Do not create or edit files, migrations, branches, PRs, projects, policies, functions, or deployments.
