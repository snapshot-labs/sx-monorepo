#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

bun install

bun run --filter '@snapshot-labs/tune' build

(cd apps/api && bun run codegen)
(cd apps/highlight && bun run codegen)
(cd apps/ui && bun run codegen)
