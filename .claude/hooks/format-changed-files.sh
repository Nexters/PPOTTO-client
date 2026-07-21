#!/usr/bin/env bash

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

FILES=$(
  { git diff --name-only --diff-filter=ACMR; \
    git ls-files --others --exclude-standard; } \
    | grep -E '\.(js|jsx|ts|tsx|json|css|scss|md|mdx|yml|yaml)$' \
    || true
)

[ -z "$FILES" ] && exit 0

printf '%s\n' "$FILES" \
  | tr '\n' '\0' \
  | xargs -0 npx --no-install prettier --write --ignore-unknown --log-level=warn