#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="python3"
if [[ -x ".venv/bin/python3" ]]; then
  PYTHON_BIN=".venv/bin/python3"
fi

echo "==> [1/4] Recompiling AI Prompt & Dialogue Archive..."
"$PYTHON_BIN" scripts/compile_full_ai_transcript.py

echo "==> [2/4] Running Data & Headless Browser Smoke Tests (npm test)..."
npm test

echo "==> [3/4] Verifying CHANGELOG.md and AI_LOG.md updates relative to HEAD..."
if [[ -z "$(git status --porcelain CHANGELOG.md)" ]]; then
  echo "ERROR: CHANGELOG.md has no changes relative to HEAD. Update CHANGELOG.md before committing." >&2
  exit 1
fi
if [[ -z "$(git status --porcelain AI_LOG.md)" ]]; then
  echo "ERROR: AI_LOG.md has no changes relative to HEAD. Update AI_LOG.md before committing." >&2
  exit 1
fi
echo "Log check passed: both CHANGELOG.md and AI_LOG.md are updated."

echo "==> [4/4] Working tree summary (git status -s):"
git status -s
echo "RELEASE CHECK PASSED."
