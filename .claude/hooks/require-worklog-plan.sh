#!/usr/bin/env bash
# PreToolUse gate for the plan-first skill.
#
# Refuses an edit when docs/worklog.md has no entry for the work in progress.
# "In progress" means the log is modified in the working tree, staged or not.
# Committing the plan with its work closes that piece of work; the next one
# needs its own entry, which is what the skill asks for anyway — a review round
# or a follow-up is new work.
#
# Two earlier predicates were wrong and are recorded here so they are not
# reintroduced:
#
#   "differs from the default branch" — on a feature branch that is true
#   forever after the first entry, so every later edit passed unplanned.
#
#   "or was touched by HEAD" — after committing one task's plan with its work,
#   HEAD touches the log, so the NEXT task's first edit passed with no plan of
#   its own. That is precisely the per-task gate this exists to be.
#
# Parsing uses node, which this repository already requires, rather than jq,
# which it does not. When the gate cannot run it allows the edit but says so,
# because a gate that disables itself in silence is worse than none.
set -uo pipefail

LOG_PATH="docs/worklog.md"

inert() {
  printf '{"systemMessage":"plan-first gate inert: %s. The edit was allowed unchecked."}\n' "$1"
  exit 0
}

payload="$(cat)" || inert "could not read the hook payload"

command -v node >/dev/null 2>&1 || inert "node not found on PATH"

file_path="$(
  printf '%s' "$payload" | node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(raw);
        process.stdout.write(String(parsed?.tool_input?.file_path ?? ""));
      } catch {
        process.exit(3);
      }
    });
  ' 2>/dev/null
)" || inert "the hook payload was not valid JSON"

# No file path means nothing for this gate to judge.
[ -n "$file_path" ] || exit 0

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || inert "not inside a git repository"
[ -n "$repo_root" ] || inert "could not locate the repository root"

# Paths outside this repository are none of this gate's business.
case "$file_path" in
  "$repo_root"/*) rel="${file_path#"$repo_root"/}" ;;
  /*) exit 0 ;;
  *) rel="$file_path" ;;
esac

# The log itself must stay writable, or writing the plan is impossible.
[ "$rel" = "$LOG_PATH" ] && exit 0

if git diff --name-only -- "$LOG_PATH" 2>/dev/null | grep -qx "$LOG_PATH"; then exit 0; fi
if git diff --cached --name-only -- "$LOG_PATH" 2>/dev/null | grep -qx "$LOG_PATH"; then exit 0; fi

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "plan-first: $LOG_PATH has no uncommitted entry for the work in progress. Add one there first — goal, why now, files, done when, and what you are explicitly not doing. Size it to the edit; one line is a plan for a one-line change. Editing $LOG_PATH is always allowed, so write the entry and retry. If the previous entry was already committed, this work needs its own. See .claude/skills/plan-first/SKILL.md."
  }
}
JSON
exit 0
