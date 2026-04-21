#!/usr/bin/env python3

"""PreToolUse hook: ask before operations that appear to include live secrets."""

from __future__ import annotations

import json
import re
import sys
from typing import Any, Iterable


INSPECT_TOOLS = {
    "apply_patch",
    "create_file",
    "edit_notebook_file",
    "run_in_terminal",
    "send_to_terminal",
    "mcp_github_create_or_update_file",
}

PATTERNS = {
    "private-key-block": r"-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) PRIVATE KEY-----",
    "aws-access-key": r"\bAKIA[0-9A-Z]{16}\b",
    "github-pat": r"\bghp_[A-Za-z0-9]{36}\b",
    "github-fg-pat": r"\bgithub_pat_[A-Za-z0-9_]{20,}\b",
    "generic-sk-token": r"\bsk-[A-Za-z0-9]{20,}\b",
    "supabase-service-role-assignment": r"SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*[\"']?[^\"'\s\n]{10,}(?=[\"'\s\n]|$)",
    "clerk-secret-assignment": r"CLERK_SECRET_KEY\s*[:=]\s*[\"']?[^\"'\s\n]{10,}(?=[\"'\s\n]|$)",
    "jwt-like-token": r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]{20,}\.[A-Za-z0-9._-]{20,}\b",
}

PLACEHOLDER_HINTS = ("example", "placeholder", "your_", "changeme", "dummy", "<")


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


def looks_like_placeholder(value: str) -> bool:
    lower = value.lower()
    return any(hint in lower for hint in PLACEHOLDER_HINTS)


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
    if tool_name and tool_name not in INSPECT_TOOLS:
        emit("allow", f"Tool '{tool_name}' is not in secret-guard inspect set.")
        return 0

    text_blob = "\n".join(deep_strings(payload))
    for pattern_name, pattern in PATTERNS.items():
        match = re.search(pattern, text_blob, flags=re.IGNORECASE)
        if match:
            matched_text = match.group(0)
            if looks_like_placeholder(matched_text):
                continue
            emit(
                "ask",
                f"Possible secret detected ({pattern_name}). Confirm before proceeding.",
            )
            return 0

    emit("allow", "No likely secrets detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())