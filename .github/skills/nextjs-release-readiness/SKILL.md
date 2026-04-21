---
name: nextjs-release-readiness
description: "Production-readiness workflow for Next.js + Vercel + Clerk (+ optional Supabase). Use for launch checks, auth callback validation, env review, and go/no-go decisions."
argument-hint: "Provide target environment (codespaces/local/preview/prod), launch deadline, and whether deploy/migrations are allowed."
---

# Next.js Release Readiness

Run this skill when you need a fast, repeatable launch decision for a Next.js application.

## When to Use

- "Can we ship tonight?"
- "Do a release-readiness check"
- "Validate Clerk + Vercel + Supabase setup"
- "Find blockers before sharing with real users"

## Procedure

1. **Establish target**
   - Confirm whether the user wants local/Codespaces, preview, or production readiness.
   - Confirm if deployment, migrations, or secret creation are permitted.

2. **Run baseline diagnostics**
   - Use [quick-readiness-check.sh](./scripts/quick-readiness-check.sh) for non-destructive checks.
   - Capture git cleanliness, runtime versions, and environment-file presence.

3. **Validate critical launch paths**
   - Authentication path (Clerk sign-in and protected routes)
   - Core multiplayer/game flow path
   - AI path (question generation / summary path)
   - Data path (in-memory vs persistent DB)

4. **Classify findings**
   - **Blocker**: must fix before launch
   - **Should-fix**: strongly recommended today
   - **Can-defer**: acceptable after launch

5. **Return a go/no-go report**
   - Give a short recommendation and a prioritized, time-boxed checklist.

## Skill Resources

- [Launch checklist](./references/checklist.md)
- [Quick readiness script](./scripts/quick-readiness-check.sh)