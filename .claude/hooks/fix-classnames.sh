#!/usr/bin/env bash

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

FILES=$(
  { git diff --name-only --diff-filter=ACMR; \
    git ls-files --others --exclude-standard; } \
    | grep -E '\.(jsx|tsx)$' \
    || true
)

[ -z "$FILES" ] && exit 0

printf '%s\n' "$FILES" \
  | tr '\n' '\0' \
  | xargs -0 npx --no-install eslint \
      --config "$CLAUDE_PROJECT_DIR/.claude/hooks/lint-classname.config.mjs" \
      --no-config-lookup \
      --fix
