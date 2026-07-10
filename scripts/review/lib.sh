#!/usr/bin/env bash
# Shared helpers for whole-app review tooling.

REVIEW_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REVIEW_REPO_ROOT="$(cd "$REVIEW_LIB_DIR/../.." && pwd)"
REVIEW_ROOT="$REVIEW_REPO_ROOT/.review"
REVIEW_RUNS_DIR="$REVIEW_ROOT/runs"
REVIEW_CURRENT_POINTER="$REVIEW_ROOT/current"
VECTORS_CONF="$REVIEW_LIB_DIR/vectors.conf"

# Defaults until review_use_active_dir / review_init_run_dir run.
REVIEW_DIR="$REVIEW_ROOT"
MANIFEST="$REVIEW_DIR/product-files.txt"

# Resolve REVIEW_DIR and MANIFEST from REVIEW_RUN_DIR, .review/current, or legacy flat .review/.
review_use_active_dir() {
  if [[ -n "${REVIEW_RUN_DIR:-}" ]]; then
    REVIEW_DIR="$REVIEW_REPO_ROOT/$REVIEW_RUN_DIR"
  elif [[ -f "$REVIEW_CURRENT_POINTER" ]]; then
    local rel
    rel="$(tr -d '[:space:]' <"$REVIEW_CURRENT_POINTER")"
    REVIEW_DIR="$REVIEW_REPO_ROOT/$rel"
  else
    REVIEW_DIR="$REVIEW_ROOT"
  fi
  MANIFEST="$REVIEW_DIR/product-files.txt"
}

# Create an isolated run directory and point .review/current at it.
review_init_run_dir() {
  local run_id="$1"
  REVIEW_RUN_DIR=".review/runs/$run_id"
  REVIEW_DIR="$REVIEW_REPO_ROOT/$REVIEW_RUN_DIR"
  MANIFEST="$REVIEW_DIR/product-files.txt"
  mkdir -p "$REVIEW_DIR" "$REVIEW_RUNS_DIR"
  printf '%s\n' "$REVIEW_RUN_DIR" >"$REVIEW_CURRENT_POINTER"
}

# Resolve a review vector by name from vectors.conf (single source of truth).
# On success sets REVIEW_VECTOR, REVIEW_PREFIX, SCAN_PROFILE, AXIS, METHODOLOGY_DOC.
# Prints known vectors and returns non-zero on an unknown or missing name.
lookup_vector() {
  local name="$1" row
  [[ -z "$name" ]] && return 1
  if [[ ! -f "$VECTORS_CONF" ]]; then
    echo "Missing vector registry: $VECTORS_CONF" >&2
    return 1
  fi

  if ! row="$(
    awk -F'|' -v n="$name" '
      /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
      { for (i = 1; i <= NF; i++) gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i) }
      $1 == n { print $2 "\t" $3 "\t" $4; found = 1 }
      END { exit !found }
    ' "$VECTORS_CONF"
  )"; then
    echo "Unknown review vector: $name" >&2
    echo "Known vectors:" >&2
    awk -F'|' '
      /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
      { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1); print "  " $1 }
    ' "$VECTORS_CONF" >&2
    return 1
  fi

  REVIEW_VECTOR="$name"
  REVIEW_PREFIX="$(printf '%s' "$row" | cut -f1)"
  SCAN_PROFILE="$(printf '%s' "$row" | cut -f2)"
  AXIS="$(printf '%s' "$row" | cut -f3)"
  METHODOLOGY_DOC="docs/review/${REVIEW_PREFIX}_METHODOLOGY.md"
}

# Compute sha256 of a file (macOS or Linux).
sha256_file() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{ print $1 }'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{ print $1 }'
  else
    echo "error: need shasum or sha256sum" >&2
    return 1
  fi
}

# Require a frozen manifest from freeze-basis.sh in the active run directory.
ensure_manifest() {
  review_use_active_dir
  if [[ ! -f "$MANIFEST" ]]; then
    echo "Missing $MANIFEST — run: pnpm review:freeze <vector>" >&2
    if [[ -f "$REVIEW_CURRENT_POINTER" ]]; then
      echo "  active run pointer: $(tr -d '[:space:]' <"$REVIEW_CURRENT_POINTER")" >&2
    else
      echo "  (no .review/current pointer — freeze a vector first)" >&2
    fi
    exit 1
  fi
}

# Run rg against manifest paths, optionally filtered by substring; write to outfile.
scan_manifest() {
  local pattern="$1"
  local sub="${2:-}"
  local outfile="${3:-}"
  local files=""
  local result=""

  if [[ -n "$sub" ]]; then
    files="$(grep -F "$sub" "$MANIFEST" || true)"
  else
    files="$(cat "$MANIFEST")"
  fi

  if [[ -z "$files" ]]; then
    if [[ -n "$outfile" ]]; then
      {
        echo "# pattern: $pattern"
        [[ -n "$sub" ]] && echo "# filter: $sub"
      } >"$outfile"
    fi
    return 0
  fi

  if result="$(
    printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 rg -n "$pattern" 2>/dev/null
  )"; then
    :
  else
    # Fallback when xargs/rg batching fails in sandboxed shells.
    result="$(
      rg -n "$pattern" $(printf '%s\n' "$files" | tr '\n' ' ') 2>/dev/null || true
    )"
  fi

  if [[ -n "$outfile" ]]; then
    {
      echo "# pattern: $pattern"
      [[ -n "$sub" ]] && echo "# filter: $sub"
      echo "$result"
    } >"$outfile"
  else
    echo "$result"
  fi
}
