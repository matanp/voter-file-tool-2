#!/usr/bin/env bash

set -e

# Keep the last runnable build until TypeScript and CSS have both succeeded.
if [ ! -d dist ] && [ -d dist.previous ]; then
  mv dist.previous dist
fi
if [ -d dist.previous ]; then
  rm -rf dist.previous
fi
rm -rf dist.next

promoted=0
cleanup() {
  if [ ! -d dist ] && [ -d dist.previous ]; then
    mv dist.previous dist
  fi
  rm -rf dist.next
  if [ "$promoted" -eq 1 ]; then
    rm -rf dist.previous
  fi
}
trap cleanup EXIT
trap 'exit 1' INT TERM HUP

pnpm exec tsc -p tsconfig.build.json --outDir dist.next
pnpm run build:css
test -f dist.next/index.js

if [ -d dist ]; then
  mv dist dist.previous
fi
mv dist.next dist
promoted=1
