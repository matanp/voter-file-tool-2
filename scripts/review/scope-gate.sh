#!/usr/bin/env bash
# Validate review deliverable citations against the frozen product manifest.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/scope-gate.mjs" "$@"
