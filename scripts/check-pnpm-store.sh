#!/bin/bash
# Run from the workspace root, as the user who will run pnpm install.
set -e

MODULES_METADATA=node_modules/.modules.yaml
[ -e "$MODULES_METADATA" ] || exit 0 # A fresh install has no previous store.

# pnpm 8 writes an absolute storeDir scalar, plain or quoted. Fail closed for missing/unrecognized metadata.
RECORDED_STORE=$(sed -n -E "s/^storeDir: *['\"]?([^'\"]*)['\"]? *\$/\1/p" "$MODULES_METADATA")
CURRENT_STORE=$(pnpm store path)
if [ -z "$RECORDED_STORE" ] || [ "$RECORDED_STORE" != "$CURRENT_STORE" ]; then
  echo "❌ Refusing to install: pnpm store does not match node_modules/.modules.yaml." >&2
  echo "   Recorded store: $RECORDED_STORE" >&2
  echo "   Current store:  $CURRENT_STORE" >&2
  echo "   Check the SSH user's pnpm configuration and store ownership before retrying." >&2
  exit 1
fi
