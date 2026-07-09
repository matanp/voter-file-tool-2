#!/usr/bin/env bash
# Map product API routes and shared schemas to __tests__ mirrors (coverage gap triage).
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

cd "$REVIEW_REPO_ROOT"
ensure_manifest

OUTPUT="$REVIEW_DIR/test-coverage-map.txt"
FRONTEND_TESTS="apps/frontend/src/__tests__"
VALIDATOR_TESTS="packages/shared-validators/src/__tests__"

{
  echo "# API routes without __tests__/api mirror"
  echo "# product route path | expected test glob"
  echo
} >"$OUTPUT"

missing_routes=0
high_risk_missing=0
high_risk_covered=0
while IFS= read -r route_file; do
  [[ "$route_file" == *"/app/api/"*"/route.ts" ]] || continue
  rel="${route_file#apps/frontend/src/app/api/}"
  rel="${rel%/route.ts}"
  test_glob="${FRONTEND_TESTS}/api/${rel}/*.test.ts"
  test_glob2="${FRONTEND_TESTS}/api/${rel}.test.ts"
  test_glob3="${FRONTEND_TESTS}/api/${rel}/route.test.ts"

  if compgen -G "$test_glob" >/dev/null ||
    [[ -f "$test_glob2" ]] ||
    [[ -f "$test_glob3" ]]; then
    continue
  fi

  echo "MISSING_TEST | $route_file | expected: ${FRONTEND_TESTS}/api/${rel}/" >>"$OUTPUT"
  missing_routes=$((missing_routes + 1))
done <"$MANIFEST"

{
  echo
  echo "# High-risk route families (illegible-bug checklist) without dedicated test mirror"
  echo
} >>"$OUTPUT"

HIGH_RISK_SUBPATHS=(
  "committee/handleRequest"
  "committee/add"
  "committee/requestAdd"
  "committee/remove"
  "admin/petition-outcomes"
  "generateReport"
  "reportComplete"
  "auth"
)

for sub in "${HIGH_RISK_SUBPATHS[@]}"; do
  route_path="apps/frontend/src/app/api/${sub}/route.ts"
  if ! grep -qxF "$route_path" "$MANIFEST" 2>/dev/null; then
    continue
  fi
  # Accept the same three naming conventions as the MISSING_TEST loop above:
  # directory mirror (api/<sub>/*.test.ts), flat file (api/<sub>.test.ts), and
  # api/<sub>/route.test.ts. This repo names route tests flat (handleRequest.test.ts),
  # so a directory-only check reports false HIGH_RISK_MISSING on covered routes.
  if compgen -G "${FRONTEND_TESTS}/api/${sub}/*.test.ts" >/dev/null ||
    [[ -f "${FRONTEND_TESTS}/api/${sub}.test.ts" ]] ||
    [[ -f "${FRONTEND_TESTS}/api/${sub}/route.test.ts" ]]; then
    echo "COVERED | $route_path"
    high_risk_covered=$((high_risk_covered + 1))
  else
    echo "HIGH_RISK_MISSING | $route_path"
    high_risk_missing=$((high_risk_missing + 1))
  fi
done >>"$OUTPUT"

{
  echo
  echo "# shared-validators schema files (heuristic: no __tests__ mention of basename)"
  echo
} >>"$OUTPUT"

if [[ -d packages/shared-validators/src/schemas ]]; then
  schema_gaps=0
  schema_covered=0
  for schema in packages/shared-validators/src/schemas/*.ts; do
    [[ -f "$schema" ]] || continue
    base="$(basename "$schema" .ts)"
    if rg -q "$base" "$VALIDATOR_TESTS" 2>/dev/null; then
      echo "COVERED | $schema"
      schema_covered=$((schema_covered + 1))
    else
      echo "SCHEMA_TEST_GAP | $schema"
      schema_gaps=$((schema_gaps + 1))
    fi
  done
fi >>"$OUTPUT"

{
  echo
  echo "# summary"
  echo "missing_api_test_mirrors=$missing_routes"
  echo "high_risk_missing=$high_risk_missing"
  echo "high_risk_covered=$high_risk_covered"
  echo "schema_test_gaps=${schema_gaps:-0}"
  echo "schema_tests_covered=${schema_covered:-0}"
} >>"$OUTPUT"

echo "Test coverage map → $OUTPUT"
echo "  missing API test mirrors: $missing_routes"
echo "  high-risk missing: $high_risk_missing"
echo "  schema test gaps: ${schema_gaps:-0}"
echo "  (Cite product route paths in findings; do not backtick test files.)"
