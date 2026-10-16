#!/usr/bin/env bash
# PreToolUse gate for the plan-first skill.
#
# Refuses an edit when docs/worklog.md carries no entry for the work in
# progress. "In progress" means the log is dirty in the working tree, or was
# touched by HEAD — so a plan written and then committed alongside its work
# still counts while that work continues.
#
# Deliberately NOT "the log differs from the default branch": on a feature
# branch that is true forever after the first entry, so the gate would pass
# every later edit regardless of whether it was planned.
#
# Fails open. A gate that breaks the session when git is unavailable or the
# repo layout is unexpected is worse than no gate — it trains people to
# delete it.
set -uo pipefail

LOG_PATH="docs/worklog.md"

payload="$(cat)" || exit 0
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)" || exit 0
[ -n "$file_path" ] || exit 0

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$repo_root" ] || exit 0

# Paths outside this repository are none of this gate's business.
case "$file_path" in
  "$repo_root"/*) rel="${file_path#"$repo_root"/}" ;;
  /*) exit 0 ;;
  *) rel="$file_path" ;;
esac

# The log itself must stay writable, or writing the plan is impossible.
[ "$rel" = "$LOG_PATH" ] && exit 0

logged=0
# Uncommitted, staged or not.
git diff --name-only -- "$LOG_PATH" 2>/dev/null | grep -qx "$LOG_PATH" && logged=1
[ "$logged" -eq 0 ] && git diff --cached --name-only -- "$LOG_PATH" 2>/dev/null | grep -qx "$LOG_PATH" && logged=1
# Or carried by the most recent commit, so one piece of work spanning a
# commit does not have to be re-logged mid-flight.
[ "$logged" -eq 0 ] && git show --name-only --format= HEAD 2>/dev/null | grep -qx "$LOG_PATH" && logged=1

[ "$logged" -eq 1 ] && exit 0

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "plan-first: $LOG_PATH has no entry for the work in progress. Add one there first — goal, why now, files, done when, and what you are explicitly not doing. Size it to the edit; one line is a plan for a one-line change. Editing $LOG_PATH is always allowed, so write the entry and retry. See .claude/skills/plan-first/SKILL.md."
  }
}
JSON
exit 0
