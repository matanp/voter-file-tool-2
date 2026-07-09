#!/usr/bin/env bash
# Freeze product-code manifest and basis metadata for a whole-app review run.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

cd "$REVIEW_REPO_ROOT"
mkdir -p "$REVIEW_DIR"

# Vector selection: `pnpm review:freeze <vector>` looks the row up in vectors.conf
# and populates REVIEW_PREFIX / SCAN_PROFILE / AXIS / METHODOLOGY_DOC. With no
# argument it falls back to any pre-set env vars, then to architecture defaults.
while [[ "${1:-}" == "--" ]]; do
  shift
done
VECTOR="${1:-${REVIEW_VECTOR:-}}"
if [[ -n "$VECTOR" ]]; then
  lookup_vector "$VECTOR" || exit 1
fi

find \
  apps/frontend/src apps/frontend/prisma apps/frontend/next.config.ts apps/frontend/package.json \
  apps/report-server/src apps/report-server/components apps/report-server/package.json \
  packages/shared-prisma/src packages/shared-prisma/package.json \
  packages/shared-validators/src packages/shared-validators/package.json \
  packages/voter-import-processor/src packages/voter-import-processor/package.json \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
    -o -name '*.prisma' -o -name 'package.json' \) \
  -not -path '*/__tests__/*' -not -name '*.test.*' -not -name '*.spec.*' \
  -not -path '*/__mocks__/*' -not -path '*/coverage/*' \
  -not -path '*/dist/*' -not -path '*/build/*' \
  2>/dev/null | LC_ALL=C sort >"$MANIFEST"

{
  echo "# Root presence"
  for root in apps/frontend/src apps/frontend/prisma apps/report-server/src \
    apps/report-server/components packages/shared-prisma/src \
    packages/shared-validators/src packages/voter-import-processor/src; do
    if [[ -e "$root" ]]; then
      echo "present: $root"
    else
      echo "MISSING: $root"
    fi
  done
  echo
  echo "# Legacy report-server/components imports (expected: no matches)"
  rg -n "report-server/components" apps/report-server/src packages apps/frontend 2>/dev/null || true
} >"$REVIEW_DIR/root-check.txt"

PRODUCT_FILES="$(wc -l <"$MANIFEST" | tr -d ' ')"
CHECKSUM="$(sha256_file "$MANIFEST")"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
DATE="$(date +%Y-%m-%d)"
MODEL_SLUG="${MODEL_SLUG:-<model-slug>}"
REVIEW_PREFIX="${REVIEW_PREFIX:-WHOLE_APP_ARCHITECTURE_REVIEW}"
AXIS="${AXIS:-DRY / consistency / maintainability / extensibility}"
SCAN_PROFILE="${SCAN_PROFILE:-architecture}"
METHODOLOGY_DOC="${METHODOLOGY_DOC:-docs/review/WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md}"
DELIVERABLE="docs/${REVIEW_PREFIX}_${MODEL_SLUG}_${DATE}.md"

cat >"$REVIEW_DIR/basis.txt" <<EOF
branch=$BRANCH
commit=$COMMIT
date=$DATE
model=$MODEL_SLUG
review_prefix=$REVIEW_PREFIX
axis=$AXIS
scan_profile=$SCAN_PROFILE
methodology_doc=$METHODOLOGY_DOC
product_files=$PRODUCT_FILES
checksum=$CHECKSUM
algorithm=sha256
inventory=pnpm review:freeze${VECTOR:+ $VECTOR}
deliverable=$DELIVERABLE
EOF

echo "Frozen basis for whole-app review ($REVIEW_PREFIX)"
echo "  manifest:      $MANIFEST ($PRODUCT_FILES files)"
echo "  checksum:      $CHECKSUM"
echo "  branch:        $BRANCH @ $COMMIT"
echo "  scan_profile:  $SCAN_PROFILE"
echo "  basis:         $REVIEW_DIR/basis.txt"
echo
echo "Basis block (copy into deliverable):"
echo "---"
cat <<EOF
## Basis
- **Branch:** \`$BRANCH\` · **Commit:** \`$COMMIT\` · **Date:** $DATE · **Model:** \`$MODEL_SLUG\`
- **Deliverable:** \`$DELIVERABLE\`
- **Product files:** $PRODUCT_FILES · **checksum:** \`$CHECKSUM\` · **algorithm:** sha256
- **Inventory:** \`pnpm review:freeze${VECTOR:+ $VECTOR}\` · **Scan profile:** \`$SCAN_PROFILE\`
- **Methodology:** \`$METHODOLOGY_DOC\`
- **Axis:** $AXIS
EOF
echo "---"
