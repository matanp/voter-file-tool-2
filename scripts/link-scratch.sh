#!/bin/sh
# Point this worktree's .scratch at the one live issue tracker in the main checkout.
# See docs/agents/issue-tracker.md.
#
# Usage: scripts/link-scratch.sh   (run from anywhere inside the worktree)
# The post-checkout hook (scripts/git-hooks/post-checkout, installed into .git/hooks) runs it when a
# worktree is created.
#
# - In the main checkout it does nothing: that .scratch is the live copy.
# - If .scratch is missing, it creates a symlink to the live copy.
# - If a real .scratch folder exists (a branch from before .scratch was untracked), it leaves it
#   alone and warns: that copy is stale.

set -eu

top=$(git rev-parse --show-toplevel)
common=$(git rev-parse --path-format=absolute --git-common-dir)
main=$(dirname "$common")
live="$main/.scratch"

if [ "$top" = "$main" ]; then
  exit 0
fi

if [ ! -d "$live" ]; then
  echo "link-scratch: no live tracker at $live; nothing linked." >&2
  exit 0
fi

target="$top/.scratch"

if [ -L "$target" ]; then
  if [ "$(cd "$target" && pwd -P)" = "$(cd "$live" && pwd -P)" ]; then
    exit 0
  fi
  echo "link-scratch: $target is a symlink to somewhere else; left alone." >&2
  exit 0
fi

if [ -e "$target" ]; then
  echo "link-scratch: $target is a real folder (this branch predates the untrack), so it is a stale copy." >&2
  echo "link-scratch: rebase onto main, resolve .scratch delete conflicts with 'git rm', then rerun this script." >&2
  exit 0
fi

ln -s "$live" "$target"
echo "link-scratch: linked $target -> $live"
