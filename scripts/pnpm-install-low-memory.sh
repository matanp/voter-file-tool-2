#!/bin/bash
# The one pnpm install used on the 1 GB report server (provisioning and deploy).
# Run from the workspace root, as the user who will own node_modules. Extra args go to pnpm install.
set -e

# CI=true lets pnpm 8 silently purge and recreate node_modules on a store mismatch, so check first.
bash "$(dirname "${BASH_SOURCE[0]}")/check-pnpm-store.sh"

# CI=true stops prompts from blocking; low concurrency keeps the install inside the instance's memory.
CI=true pnpm install --frozen-lockfile --network-concurrency=4 --child-concurrency=1 "$@"
