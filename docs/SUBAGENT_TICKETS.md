# Subagent Ticket Standard

> The contract for delegating work to subagents. The orchestrator (the session
> that spawns subagents) follows this when cutting tickets; every ticket handed
> to a subagent uses the template below, verbatim.

A subagent starts with **zero context** and **cannot ask questions mid-flight**.
Tickets fail for predictable reasons: too much scope, an embedded judgment
call, a vague definition of done, or missing context the orchestrator forgot it
had. This format exists to eliminate those four failure modes — mostly by
forcing tickets to be smaller than feels natural.

---

## Sizing rules — split before you write

A ticket is too big if **any** of these is true. Split it.

1. **It owns more than 2 files.** (Purely mechanical `git mv` / rename sweeps
   are exempt — judgment-free bulk moves count as one operation.)
2. **It needs more than 5 numbered steps.**
3. **It contains a decision and its implementation.** The orchestrator makes
   the decision first — greps the code, picks the value, chooses the approach —
   and the ticket implements it. If a ticket says "decide", "choose",
   "when unsure", or "conservatively", it is not a ticket yet.
4. **It mixes investigation and change.** "Find out X" and "change Y" are
   different tickets, usually in different waves. (A **wave** is a batch of
   tickets launched in parallel; the next wave starts only after the previous
   one is merged.) The finding feeds the orchestrator, who then cuts the
   change ticket.
5. **It has more than one acceptance criterion.** One ticket, one observable
   "done". (A standard verification gauntlet — typecheck, tests, build —
   counts as one criterion.)
6. **You would hesitate to throw the result away and re-run it.** A ticket is
   sized right when failure is cheap: roughly 30 minutes of agent work, small
   enough that a bad result costs nothing but the re-run.

The instinct being corrected: orchestrators (human and AI alike) consistently
cut tickets 2–3× too large. When torn, split.

## Template — all seven fields, every time

```markdown
### T<n> · <verb-first title naming the one deliverable>

**Why:** 1–2 sentences. The motivating problem, not the project history.
**Files owned:** exact paths. Touching any other file = stop and report.
**Task:** numbered steps. Concrete: paths with line numbers, exact names,
exact values. No step may require a decision.
**Verify:** exact commands and their expected output.
**Out of scope:** the adjacent temptations, named explicitly.
**Report back:** what the final message must contain.
```

Field notes:

- **Why** is one breath of motivation so the agent understands intent — not a
  license to reinterpret the task.
- **Files owned** is a hard boundary, and ownership sets must be pairwise
  disjoint within a wave (see below). It is also the out-of-scope rule's
  enforcement mechanism.
- **Out of scope** exists because agents "improve" nearby code — fix lint
  warnings, rename variables, refactor adjacent functions. Name the specific
  temptations this ticket will surface and forbid them. Observations go in the
  report, not the diff.
- **Verify** commands must work in this repo's environment: assume a fresh
  container, state any env vars needed (see boilerplate), and remember builds
  need the dummy-env trio below.

## Standing rules — ride along with every ticket

Paste into every ticket, adjusted for branch name:

```
Rules:
- Work on branch <branch>. Commit locally with a conventional-commit message.
  Do NOT push.
- If any step's assumption turns out false (file moved, line drifted, test
  already passing, command output differs from expected), STOP and report.
  Do not improvise a workaround.
- No drive-by fixes. Anything broken outside your owned files goes in your
  report, not your diff.
- Builds and dev servers in this repo need env vars. Use:
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dGVzdC1jbGVyay1kdW1teS5jbGVyay5hY2NvdW50cy5kZXYk
  CLERK_SECRET_KEY=sk_test_dummy
  XAI_API_KEY=xai-dummy
- Report back: files changed, verification output (paste it), and anything
  surprising you noticed but did not touch.
```

The dummy env trio above is throwaway by design, but it must stay in sync with
the `env:` block in `.github/workflows/ci.yml` — when one changes, change both
in the same commit.

## Orchestrator checklist — before launching a wave

- [ ] Every decision is resolved. Grep results, chosen values, and approach
      calls are baked into ticket text — no ticket contains an open question.
- [ ] File-ownership sets are pairwise disjoint within the wave.
- [ ] At most one ticket anywhere touches `package.json` / `package-lock.json`,
      and that ticket runs **alone** in its own wave (lockfile diffs conflict
      with everything, and concurrent `npm install` corrupts a shared tree).
- [ ] Cross-ticket couplings are written into **both** tickets (e.g., one
      ticket adds a constant another consumes; one makes an env var required
      that another must provide in CI).
- [ ] Agents sharing a working tree don't run `npm install` or builds
      concurrently — use worktree isolation for parallel waves.
- [ ] The orchestrator — not the agents — merges, runs the full gauntlet once
      on the merged result, pushes, and opens the PR.

## Worked example

A model ticket, from the August 2026 triage (see `docs/TRIAGE` history):

```markdown
### T2 · Add health and cron endpoints to the public-route matcher

**Why:** Clerk's auth.protect() answers unauthenticated API calls with 404, so
/api/health, /api/health/db, and /api/cron/cleanup are unreachable — the
Vercel nightly cleanup cron has never run.

**Files owned:** src/middleware.ts

**Task:**

1. In the isPublicRoute matcher (line 5), add two entries:
   '/api/health(.\*)' and '/api/cron/cleanup'.
2. Nothing else changes. The cron route keeps its own Bearer CRON_SECRET
   check at src/app/api/cron/cleanup/route.ts:23 — that is the security
   boundary, not the middleware.

**Verify:** Start dev (npx next dev -p 9002, dummy env trio exported), then:

- curl -s -o /dev/null -w '%{http_code}' localhost:9002/api/health → 200
- curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer wrong" \
   localhost:9002/api/cron/cleanup → 401 (was 404)

**Out of scope:** the CSRF block, security headers, and CSP strings in the
same file; any change to the cron route itself.

**Report back:** the two curl status codes, pasted.
```

Note what makes it work: one file, two lines, zero decisions, verification an
agent cannot fake, and the tempting adjacent code explicitly fenced off.
