#!/usr/bin/env python3
"""SessionStart hook: a summary of the recent commits on this branch, shown at the start of every chat."""
import json
import subprocess


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


branch = git("rev-parse", "--abbrev-ref", "HEAD") or "(no branch)"
log = git("log", "-10", "--date=short", "--format=%h  %ad  %s")
changed = [l for l in git("status", "--porcelain").splitlines() if l.strip()]

lines = [f"Branch: {branch}", "", "Last commits:"]
lines += ["  " + l for l in log.splitlines()] if log else ["  (no commits yet)"]
if changed:
    lines += ["", f"Uncommitted changes: {len(changed)} file(s)"]
summary = "\n".join(lines)

print(json.dumps({
    "systemMessage": summary,
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": "Recent commits in this repository (from the SessionStart hook):\n" + summary,
    },
}))
