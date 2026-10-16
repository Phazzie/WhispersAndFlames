#!/usr/bin/env bash
# PreToolUse gate for the plan-first skill.
#
# Refuses an edit when docs/worklog.md has no entry for the work in progress.
# "In progress" means the log is modified in the working tree, staged or not.
# Committing the plan with its work closes that piece of work; the next one
# needs its own entry, which is what the skill asks for anyway — a review round
# or a follow-up is new work.
#
# Three earlier predicates were wrong and are recorded so they are not
# reintroduced by someone who thinks they are loosening something harmless:
#
#   "differs from the default branch" — on a feature branch that is true
#   forever after the first entry, so every later edit passed unplanned.
#
#   "or was touched by HEAD" — after committing one task's plan with its work,
#   HEAD touches the log, so the NEXT task's first edit passed with no plan of
#   its own. That is precisely the per-task gate this exists to be.
#
#   pathspecs relative to the process working directory — Claude's cwd follows
#   it after a cd, so a root-level plan was invisible from a subdirectory and a
#   planned edit was denied. Every git call is now anchored with -C and a
#   top-anchored pathspec.
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
        // Windows gives backslash separators even under Git Bash, and a
        // forward-slash comparison would never match them.
        process.stdout.write(String(parsed?.tool_input?.file_path ?? "").replace(/\\/g, "/"));
      } catch {
        process.exit(3);
      }
    });
  ' 2>/dev/null
)" || inert "the hook payload was not valid JSON"

# No file path means nothing for this gate to judge.
[ -n "$file_path" ] || exit 0

# Anchor on the project Claude Code was started in, not on whatever checkout
# the working directory happens to sit in. Rediscovering the root from the cwd
# would let another repository supply the script that runs here.
repo_root="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$repo_root" ]; then
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || inert "not inside a git repository"
fi
[ -n "$repo_root" ] || inert "could not locate the project root"
repo_root="${repo_root//\\//}"
repo_root="${repo_root%/}"

# Paths outside this project are none of this gate's business.
case "$file_path" in
  "$repo_root"/*) rel="${file_path#"$repo_root"/}" ;;
  /* | [A-Za-z]:/*) exit 0 ;;
  *) rel="$file_path" ;;
esac

# The log itself must stay writable, or writing the plan is impossible — and
# the policy leans on that: even an incident is one log line before the fix.
[ "$rel" = "$LOG_PATH" ] && exit 0

# ":/" anchors the pathspec at the repository root regardless of cwd.
if git -C "$repo_root" diff --name-only -- ":/$LOG_PATH" 2>/dev/null | grep -qx "$LOG_PATH"; then exit 0; fi
if git -C "$repo_root" diff --cached --name-only -- ":/$LOG_PATH" 2>/dev/null | grep -qx "$LOG_PATH"; then exit 0; fi

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "plan-first: $LOG_PATH has no uncommitted entry for the work in progress. Add one there first — goal, why now, files, done when, and what you are explicitly not doing. Size it to the edit; one line is a plan for a one-line change, and one line is also the whole requirement during an incident. Editing $LOG_PATH is always allowed, so write the entry and retry. If the previous entry was already committed, this work needs its own. See .claude/skills/plan-first/SKILL.md."
  }
}
JSON
exit 0
