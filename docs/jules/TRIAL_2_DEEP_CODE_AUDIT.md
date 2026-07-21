# WF-JULES-TRIAL-AUDIT-001 — Hostile deep code audit

## Capability being tested

This is a deep, read-only investigation. Show whether Jules can find concrete defects that ordinary implementation work and existing tests missed, distinguish real failures from theoretical concerns, and produce evidence that another engineer can verify quickly.

## Base check — mandatory before all other work

The launch message supplies an exact expected branch and full expected Git SHA. Run `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git rev-parse HEAD` first. If the checkout is dirty, the branch is not `production/core-foundation`, or HEAD differs from the supplied SHA, perform no audit and finish with `BASE_MISMATCH`, showing only the observed branch and SHA. Never inspect or print `.env*` files or values. Do not use legacy code, branches, archives, or prior application implementations.

Read root `AGENTS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, every nested `AGENTS.md`, production source, focused tests, and relevant configuration. Do not edit, create, delete, format, commit, publish a branch, or open a PR. Test/build byproducts inside the disposable VM are acceptable, but the Git worktree must remain clean.

## Mission

Try to break the current production foundation in six ways:

1. **Privacy and consent:** partner preferences, answers, skips, ballots, match evidence, tokens, names sent unnecessarily to AI, inference oracles, unsafe Scribe/Ember inputs, and zero-match integrity.
2. **Authorization and server correctness:** token/room confusion, cross-room access, invalid phase transitions, idempotency holes, stale commands, replay after response loss, third-seat or concurrency races, and allowlist projection failures.
3. **Async and recovery:** late requests resurrecting abandoned rooms, overlapping polling/mutations, unbounded waits or retries, terminal errors, stale tabs, refresh/restart behavior, and browser storage failure.
4. **AI failure boundaries:** malformed/refused/unsafe outputs, provider widening, prompt provenance, validator bypasses, unsupported semantic matches, and sensitive logging or error leakage.
5. **Accessibility and interaction:** keyboard traps, focus loss across phases, missing announcements, unusable error recovery, contrast, disabled/loading races, mobile behavior, and clipboard failure.
6. **Proof and delivery:** tests that pass without proving their claim, missing negative privacy assertions, stale manual evidence, dependency/build/CI gaps, and ways a defective change could be called complete.

Run relevant read-only searches and focused tests where they materially confirm or disprove a suspected issue. Do not list generic best practices. Every finding must describe an actual failure path in this repository.

## Required report

Return findings ordered by severity (`P0`, `P1`, `P2`, `P3`). Each finding must include:

- a short defect title;
- exact `path:line` evidence;
- the concrete user, privacy, security, or delivery failure scenario;
- why existing code or tests do not prevent it;
- the smallest credible correction boundary;
- the exact missing regression proof;
- confidence (`high`, `medium`, or `low`).

Also include:

- the five most important findings in priority order;
- suspected issues you investigated and rejected as false positives;
- commands run and their outcomes;
- areas not deeply inspected and why;
- a final count by severity.

If there are no findings at a severity, say so. Do not inflate severity. A P0 must enable immediate catastrophic privacy/security loss or make the product fundamentally unsafe; a P1 must be a release blocker with a plausible concrete path.

Finish by proving `git status --short` is empty. The final status must be `AUDIT_COMPLETE`, `BASE_MISMATCH`, or `BLOCKED`. No PR is wanted for this mission.
