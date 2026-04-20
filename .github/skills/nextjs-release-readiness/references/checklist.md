# Tonight Launch Checklist (Next.js + Clerk + Optional DB)

Use this checklist to decide if a same-night release is realistic.

## Critical (must pass)

- [ ] App starts with no startup errors.
- [ ] Authentication works end-to-end (sign in, redirect, protected route access).
- [ ] At least one complete happy-path game session works with two players.
- [ ] Required runtime secrets are configured in the target environment.
- [ ] No known high-severity security issue is introduced by launch config.

## Strongly Recommended (should pass)

- [ ] Typecheck and lint pass.
- [ ] Core unit tests pass (or known failures are documented and unrelated).
- [ ] Preview URL tested on at least 2 devices/browsers.
- [ ] Error monitoring/logging path is checked.

## Nice to Have (can defer)

- [ ] Performance tuning and polish tasks.
- [ ] Long-tail edge-case fixes.
- [ ] Extended E2E regression suite.

## Decision Rubric

- **GO**: all Critical are green, and no major regression risk is known.
- **GO with guardrails**: all Critical are green, some Should-fix remain with explicit follow-up owners.
- **NO-GO**: any Critical item fails.