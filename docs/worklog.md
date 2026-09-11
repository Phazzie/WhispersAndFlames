# Work log

Newest first. One entry per piece of work, per the `plan-first` skill.
Conflicts here are resolved by keeping both entries, never by deleting one.

---

## 2026-09-11

### Add the plan-first skill

**Goal:** a skill that forces a written plan before any edit, and routes mid-task
discoveries through four explicit buckets instead of absorbing them into whatever change
is already open.

**Why now:** PR #91 was opened as "field-level authorization" and shipped 22 files across
10 commits — authorization plus a read-escalation fix, an end-of-game repair, timestamp
typing, rate-limit keying, dead-dependency removal, and three PRDs. Every piece was real
work. The owner never got a chance to say "that's a separate PR", because the question was
never asked out loud. Scope creep does not feel like creep from the inside; it feels like
doing a good job, which is why it needs a mechanical gate rather than good intentions.

**Files:** `.claude/skills/plan-first/SKILL.md` (new), `docs/worklog.md` (new, this file)

**Done when:** the skill is on its own branch with its own PR, and the two places where
the draft overrode the owner are resolved in whichever direction they chose.

**Explicitly not doing:** no settings.json hook to enforce it, no changes to CLAUDE.md, no
retroactive log entries for work already merged.

#### Owner decisions on the draft

The first draft quietly overrode two instructions. Both went back to the owner:

- **Planning threshold.** The ask was "any edit at all". The draft wrote "sized to the
  edit". Owner chose **sized to the edit**, so the draft's wording stands — but it stood
  by their decision, not by mine going unnoticed.
- **Log layout.** The ask was "a running log". The draft wrote per-session files under
  `docs/worklog/`, to dodge merge conflicts. Owner chose **one running file**. Changed to
  this file, with an explicit rule that conflicts are resolved by keeping both entries.

#### Found: the stop hook asked for a commit that would have drifted → bucket 3, separate

Mid-task, the git stop hook asked for the untracked `.claude/` directory to be committed
and pushed. The only branch this session is authorised to push is
`claude/app-troubleshooting-r38hbx`, which is PR #91 — the authorization review. Complying
would have dropped an unrelated working-style file into a security PR: the exact failure
the skill exists to prevent, on its first use.

Held it as a local unpushed commit instead, surfaced the branch question to the owner, and
moved it here once they said "its own branch, then the PR". Logged rather than absorbed.

#### Found: CLAUDE.md and the session config disagree about subagents → bucket 4, not ours

`CLAUDE.md` documents a subagent ticket standard (`docs/SUBAGENT_TICKETS.md`); this
session's harness config defaults subagents off. I had been describing the config line as
though the owner had said it. They had not. Raised, and they confirmed the repo standard
wins. No code change — recorded so it is not rediscovered.
