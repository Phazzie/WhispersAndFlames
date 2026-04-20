#!/usr/bin/env python3

"""PreToolUse hook: ask for confirmation on risky/costly operations."""

from __future__ import annotations

import json
import re
import sys
from typing import Any, Iterable


RISKY_PATTERNS = [
    r"\bvercel\s+deploy\b",
    r"\bvercel\s+env\s+(add|rm|pull)\b",
    r"\bsupabase\s+db\s+(push|reset|remote\s+commit)\b",
    r"\b(prisma|drizzle)\s+migrate\b",
    r"\baz\s+deployment\b",
    r"\bterraform\s+apply\b",
    r"\b(kubectl|helm)\s+(delete|upgrade|rollback|uninstall)\b",
    r"\brm\s+-rf\b",
    r"\bdrop\s+table\b",
    r"\btruncate\s+table\b",
    r"\b(secret|secrets?)\s+(set|create|add|rotate)\b",
]

GATED_TOOLS = {
    "run_in_terminal",
    "send_to_terminal",
    "create_and_run_task",
}


def deep_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for k, v in value.items():
            yield str(k)
            yield from deep_strings(v)
    elif isinstance(value, list):
        for item in value:
            yield from deep_strings(item)
    elif value is not None:
        yield str(value)


def emit(decision: str, reason: str) -> None:
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }
    sys.stdout.write(json.dumps(output))


def detect_tool_name(payload: dict[str, Any]) -> str:
    for key in ("tool_name", "toolName", "tool", "name"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    event_data = payload.get("data")
    if isinstance(event_data, dict):
        for key in ("tool_name", "toolName", "tool", "name"):
            value = event_data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    return ""


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        emit("allow", "No hook payload provided.")
        return 0

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        emit("allow", "Could not parse hook payload JSON.")
        return 0

    tool_name = detect_tool_name(payload)
    if tool_name and tool_name not in GATED_TOOLS:
        emit("allow", f"Tool '{tool_name}' is not in guarded set.")
        return 0

    text_blob = "\n".join(deep_strings(payload)).lower()
    for pattern in RISKY_PATTERNS:
        if re.search(pattern, text_blob, flags=re.IGNORECASE):
            emit(
                "ask",
                "Potentially destructive/costly action detected. Request explicit user approval.",
            )
            return 0

    emit("allow", "No risky command patterns detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())