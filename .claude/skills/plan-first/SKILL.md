---
name: plan-first
description: Plan work before doing it, and route mid-task discoveries through the plan instead of silently absorbing them. Use this skill before ANY edit to this repo — a one-line fix, a refactor, a fix-everything session, a PR review round — and any time you find something unplanned while working. Especially important during autonomous runs where the owner is away and cannot object to scope growing. If you catch yourself about to fix something you did not set out to fix, that is exactly the moment this skill is for.
---

# Plan first, then hold the plan

## Why this exists

The failure this prevents is not "found a bug while doing something else." Finding
things is good — the most valuable defect in this repo's August 2026 session was found
sideways, while tightening an unrelated type.

The failure is **deciding alone that the find belongs in the change you are already
making.** That decision is the owner's, and it gets taken away silently.

Concretely, PR #91 started as "field-level authorization" and shipped as 22 files and
10 commits: authorization, plus a read-escalation fix, plus an end-of-game repair, plus
timestamp typing, plus rate-limit keying, plus dead-dependency removal, plus three PRDs.
Every piece was real. The owner never got to say "that's a separate PR," because there
was never a moment where the question was asked.

Scope creep does not feel like creep from the inside. It feels like doing a good job.
That is exactly why it needs a mechanical gate rather than good intentions.

## The log

Everything goes in one running file:

```
docs/worklog.md
```

One file, not one per session — so there is a single place to look. Newest work at the
top, under a `## YYYY-MM-DD` heading, with each plan and discovery nested beneath it.

Two branches editing it will conflict, and the resolution is always the same: **keep both
entries.** A conflict here is two pieces of history, not a disagreement. Never resolve it
by deleting someone else's line to make the merge clean.

The log is for the owner to read, so write it for them: what you set out to do, what you
found, what you decided, why. Not a transcript.

### What does not go in the log

**Unfixed security and privacy specifics.** This repository is public. A bucket-3 entry
spelling out an exploitable authorization or privacy hole publishes a working attack before
the fix exists. Record the fact and the shape — "unfixed read-access gap on the game GET
route, specifics sent privately" — and get the details to the owner out of band. Redaction
is not suppression: the entry still exists, so the finding cannot quietly disappear.

**Anything found during a read-only pass.** A code review, an audit, an investigation that
changes nothing writes no log entry at all. Writing one dirties a worktree that is supposed
to stay clean, and on a review branch it risks committing reviewer notes into the change
under review. Findings from a read-only pass belong in the review itself.

### The log alone is not durable

An entry only reaches the owner's running file if its branch merges. A deferred bucket-3
find recorded on a branch that is later abandoned is lost exactly when losing it hurts
most — it was the one thing deliberately left undone. So for any deferred find worth
returning to, open a tracker issue and reference it from the log entry. The log says what
happened; the issue outlives the branch.

## Before any edit

Write the plan first. **Size it to the work** — this is the part that decides whether the
skill gets used or quietly abandoned. A plan that costs more than the fix will be skipped,
and then the discipline is fiction.

For a small edit, one line in the log is a plan:

```md
### 14:20 — fix typo in README install step

Single word. No behaviour change.
```

For real work, enough to be steerable:

```md
### 14:35 — field-level authorization on the update route

**Goal:** a caller may only modify their own answer and their own player entry.
**Why now:** either partner can currently forge the other's answers, which feed the AI summary.
**Files:** src/lib/game-authorization.ts (new), src/app/api/game/update/route.ts
**Done when:** attack cases refused, bulk un-ready reset still works, existing tests pass.
**Explicitly not doing:** per-action endpoints, the lost-update races.
```

That last line does the most work. Naming what you are _not_ doing is what makes later
drift visible — to you, and to whoever reads the log.

If the plan takes more than a couple of minutes to write, that is a signal the work is
bigger than it looked, which is worth knowing before starting rather than after.

## The discovery gate

**When you find something you did not set out to find, stop before touching it.**

Not "finish this bit first, then think about it" — the finishing is where it gets
absorbed. Stop at the moment of noticing, while the choice is still open.

Then classify it into one of four buckets. Say which one, and why:

**1. Blocks the plan.** You cannot deliver what you set out to deliver without it. Do it,
and record that you did. _Example: a type fix won't compile because a caller passes the
wrong shape — fixing that caller is part of the type fix._

**2. Fits the plan's shape.** Same file, same concern, and a reviewer would find it odd to
see one without the other. Propose it; do not assume it. _Example: while adding write
authorization, finding a read-authorization hole two lines away._

**3. Separate work.** Real, worth doing, but its own change with its own review.
**Log it. Do not do it.** _Example: while fixing authorization, noticing every failed
submit wipes the user's typed answer._

**4. Not ours.** Out of scope for this project or this person's priorities. Log a line so
it is not rediscovered from scratch, and move on.

Bucket 3 is the one that gets skipped, and it is the one that matters. The pull to fix
something you have already understood is strong — you have the context loaded, it would
take ten minutes, it feels wasteful to walk away. Walk away anyway. The ten minutes is
not the cost; the cost is a change that no longer matches its own description.

### Recording a discovery

```md
#### Found: completedAt missing from the update schema → bucket 3, separate

The end-of-game write sends { summary, completedAt }; the schema is .strict() and has no
completedAt, so Zod 400s and no completed game ever saves its summary.
Not in this change — this is a product-breaking bug that deserves its own PR and its own
review, and burying it inside an authorization change hides it.
Logged for: next work item.
```

## When the owner is away

Autonomous runs are where this matters most and where the gate is weakest — there is
nobody to propose bucket 2 to, and the temptation is to treat "they said fix everything"
as blanket permission for any scope.

It isn't. "Fix everything" authorizes the _work_, not the _bundling_.

**So bucket 2 is not available while the owner is away.** There is no proposal without
someone to propose to, and "they would have said yes" is an approval you granted yourself.
A find that would have been bucket 2 is handled as bucket 3 instead: logged, left undone,
and named in the PR body as the next thing.

One narrow exception: leaving it undone is actively unsafe — a live security or privacy
hole, or data being lost right now. Then do it, but **in its own commit**, so the owner can
lift it back out without unpicking it from unrelated work. Say so at the top of the PR
body, not buried in the diff.

Either way, decide the way this particular owner would — not by a generic rule, but from
what you know about them — and then **write the inference down**, not just the decision:

```md
#### Found: playerIds accepts arbitrary ids → would be bucket 2, treated as bucket 3

Grants a stranger permanent read access to both partners' answers.
Owner is away, so folding it into the open PR is not mine to approve. Judging they would
want it fixed soon but separately: a privacy fix that arrives inside an authorization PR is
a privacy fix nobody reviewed on its own merits.
Logged as the next work item and named at the top of the PR body.
Correct me if that's wrong.
```

The value is not the decision — it is that they can audit it in ten seconds instead of
reconstructing it from a diff. A wrong call that was reasoned and recorded is recoverable.
A right call that was silent still costs them their say.

## Signals you have drifted

Check these when work feels like it is sprawling:

- **The title no longer describes the diff.** If the PR is called "fix X" and reviewing it
  requires understanding Y and Z, scope has moved and the description is now misleading.
- **You cannot state the goal in one sentence** without "and also."
- **The plan's "explicitly not doing" list has quietly become things you did.**
- **You are fixing something you found less than a minute ago** with no log entry for it.

Any of these means: stop, re-read the plan, and either update it deliberately or split.

Updating the plan is fine — plans should change when you learn something. What is not fine
is the plan changing without anyone noticing, which is the same thing as having no plan.

## What this skill does not enforce

Be honest about the mechanism: this is a model-invoked skill. It fires when it gets
selected, and nothing written here can make that happen. An agent that never loads it can
edit every file in the repo without putting a line in `docs/worklog.md`.

So the guarantee is weaker than the language above — the skill sets the standard, it does
not impose it. Two things would impose it, and both are the owner's call rather than
something to add unilaterally:

- A line in `CLAUDE.md` pointing at this skill, so it arrives in context on every session
  instead of depending on selection.
- A `PreToolUse` hook on Edit and Write that refuses when `docs/worklog.md` carries no
  entry for the work in progress.

Until one of those exists, treat a missing log entry as the likeliest failure mode, not as
evidence that no planning was needed.

## What this skill is not for

**It is not for suppressing findings.** A gate that makes you ignore a live bug is worse
than no gate. Every discovery gets logged. The gate governs what you _do_, not what you
_notice_.

**It is not a reason to stop mid-emergency.** If production is broken and you are fixing
it, fix it. Log it after.

**It is not a substitute for asking.** When the owner is reachable and the call is genuinely
theirs — a product decision, a risk trade-off, anything touching auth or data deletion —
the gate ends in a question, not a judgment.
