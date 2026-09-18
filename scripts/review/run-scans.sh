#!/usr/bin/env bash
# Run mechanical scans against the frozen product-code manifest.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

cd "$REVIEW_REPO_ROOT"
ensure_manifest

# `pnpm review:scans <vector>` resolves the scan profile from vectors.conf.
# With no argument the profile comes from SCAN_PROFILE, then basis.txt, then default.
while [[ "${1:-}" == "--" ]]; do
  shift
done
REQUESTED_VECTOR=""
if [[ -n "${1:-}" ]]; then
  REQUESTED_VECTOR="$1"
  lookup_vector "$REQUESTED_VECTOR" || exit 1
fi

SCAN_PROFILE="${SCAN_PROFILE-}"
profile_from_basis=""
if [[ -f "$REVIEW_DIR/basis.txt" ]]; then
  profile_from_basis="$(grep -E '^scan_profile=' "$REVIEW_DIR/basis.txt" | cut -d= -f2- || true)"
fi

if [[ -z "$SCAN_PROFILE" ]] && [[ -n "$profile_from_basis" ]]; then
  SCAN_PROFILE="$profile_from_basis"
fi
SCAN_PROFILE="${SCAN_PROFILE:-architecture}"

if [[ -n "$profile_from_basis" && "$profile_from_basis" != "$SCAN_PROFILE" ]]; then
  {
    echo "Scan profile mismatch:"
    echo "  frozen basis: $profile_from_basis"
    echo "  requested:    $SCAN_PROFILE${REQUESTED_VECTOR:+ (vector: $REQUESTED_VECTOR)}"
    echo "Run 'pnpm review:freeze${REQUESTED_VECTOR:+ $REQUESTED_VECTOR}' to completion before scans, then rerun 'pnpm review:scans${REQUESTED_VECTOR:+ $REQUESTED_VECTOR}'."
  } >&2
  exit 1
fi

rm -f "$REVIEW_DIR"/scan-*.txt
echo "scan_profile=$SCAN_PROFILE" >"$REVIEW_DIR/scan-profile.txt"
echo "Running mechanical scans (profile: $SCAN_PROFILE) → $REVIEW_DIR/scan-*.txt"

# --- Scan definitions -------------------------------------------------------
# One `rg` scan per name: prints "<pattern>\t<subpath filter>" (empty filter =
# whole manifest). The outfile is derived by convention: scan-<name>.txt.
# `api-route-wrappers` is a carve-out below — it runs `pnpm check:api-routes`,
# not scan_manifest.
scan_def() {
  case "$1" in
    api-routes)         printf '%s\t%s' 'export const (GET|POST|PUT|PATCH|DELETE)|withPrivilege|withBackendCheck|withPublic' 'app/api' ;;
    validation)         printf '%s\t%s' 'validateRequest|z\.object|safeParse' '' ;;
    parse-casts-params) printf '%s\t%s' 'parse\(|as [A-Z][A-Za-z]+|request\.json|searchParams' '' ;;
    domain-enums)       printf '%s\t%s' 'ReportType|PrivilegeLevel|MembershipStatus|AuditAction|status:|type:' '' ;;
    prisma-writes)      printf '%s\t%s' '\$transaction|findFirst|findUnique|update\(|upsert\(|create\(' '' ;;
    client-api-ui)      printf '%s\t%s' 'useApiQuery|useApiMutation|fetch\(|toast|setLoading|isLoading|error' '' ;;
    upload)             printf '%s\t%s' 'presigned|uploadUrl|FormData|xlsx|csv|file input|accept=' '' ;;
    messages-envelopes) printf '%s\t%s' '"message":|NextResponse\.json\(\{ error|toast\(' '' ;;
    labels)             printf '%s\t%s' 'label:|displayName|formatLabel' '' ;;
    shared-helpers)     printf '%s\t%s' 's3Utils|webhookUtils|committeeMappingHelpers|DesignationWeight' '' ;;
    pii-data)           printf '%s\t%s' 'email|phone|address|voter|VoterRecord|PII|export|download|presigned|uploadUrl|reportUrl|fileUrl' '' ;;
    async-jobs)         printf '%s\t%s' 'reportJob|ReportJob|reportComplete|webhook|Ably|status|retry|idempot|queue|timeout|setTimeout' '' ;;
    migration-data)     printf '%s\t%s' 'enum |ReportType|MembershipStatus|PrivilegeLevel|@default|@@unique|@@index|backfill|legacy|deprecated' '' ;;
    operations)         printf '%s\t%s' 'process\.env|env\.|NEXT_PUBLIC|Sentry|console\.(error|warn)|logger|health|timeout|retry|fallback' '' ;;
    data-lifecycle)     printf '%s\t%s' 'expiresIn|expiresAt|expir|presigned|uploadUrl|reportUrl|fileUrl|getSignedUrl|deleteObject|DeleteObject|cleanup|retention|archive|purge|stale|inviteToken|token.*expir|ReportJob|reportComplete' '' ;;
    frontend-state)     printf '%s\t%s' 'isLoading|isSubmitting|isPending|useOptimistic|startTransition|window\.confirm|AlertDialog|disabled=\{|minPrivilege|hasPermissionFor' '' ;;
    accessibility)      printf '%s\t%s' 'aria-[a-z]+=|role=|DialogDescription|DialogTitle|VisuallyHidden|htmlFor=|alt=|flex-wrap|w-max|overflow-x-auto' '' ;;
    dev-experience)     printf '%s\t%s' 'DATABASE_URL|\.env\.(local|example)|docker-compose|setup-dev-db|db:seed|seed-lted-crosswalk|testcontainers|TEST_DATABASE_URL|beforeAll\(|afterAll\(|process\.env\.[A-Z_]+ \?\?|require.*localhost' '' ;;
    *) return 1 ;;
  esac
}

# --- Scan profiles ----------------------------------------------------------
# profile -> ordered scan-name list. Add a scan to a profile by editing one
# line here; add a scan definition above. No case/function edits elsewhere.
profile_scans() {
  case "$1" in
    architecture)           echo "api-routes validation parse-casts-params domain-enums prisma-writes client-api-ui upload messages-envelopes labels shared-helpers api-route-wrappers" ;;
    trust)                  echo "api-routes validation parse-casts-params prisma-writes api-route-wrappers" ;;
    domain-invariants)      echo "domain-enums prisma-writes shared-helpers" ;;
    contracts)              echo "validation parse-casts-params messages-envelopes domain-enums client-api-ui" ;;
    validation-testability) echo "validation parse-casts-params messages-envelopes domain-enums api-routes api-route-wrappers" ;;
    pii-data)               echo "pii-data api-routes validation upload client-api-ui messages-envelopes" ;;
    async-reliability)      echo "async-jobs prisma-writes messages-envelopes shared-helpers api-routes" ;;
    migration-data-evolution) echo "migration-data domain-enums prisma-writes validation shared-helpers" ;;
    operations-readiness)   echo "operations upload async-jobs messages-envelopes api-routes" ;;
    data-lifecycle-retention) echo "data-lifecycle upload async-jobs pii-data prisma-writes api-routes" ;;
    frontend-state-interaction) echo "frontend-state client-api-ui messages-envelopes domain-enums api-routes" ;;
    accessibility-mobile)   echo "accessibility client-api-ui labels upload" ;;
    dev-experience-reproducibility) echo "dev-experience operations migration-data shared-helpers" ;;
    design-ui)                    echo "frontend-state client-api-ui messages-envelopes labels accessibility" ;;
    *) return 1 ;;
  esac
}

scan_api_route_wrappers() {
  {
    echo "# pnpm check:api-routes (trust-boundary wrapper audit)"
    if pnpm run --silent check:api-routes 2>&1; then
      echo "PASS"
    else
      echo "FAIL — see output above"
    fi
    echo
    echo "# API route inventory"
    node scripts/check-api-route-wrappers.mjs --inventory-only 2>&1 || true
  } >"$REVIEW_DIR/scan-api-route-wrappers.txt" || true
}

run_scan() {
  local name="$1" def pattern sub
  if [[ "$name" == "api-route-wrappers" ]]; then
    scan_api_route_wrappers
    return
  fi
  if ! def="$(scan_def "$name")"; then
    echo "Unknown scan: $name" >&2
    exit 1
  fi
  pattern="${def%%$'\t'*}"
  sub="${def#*$'\t'}"
  scan_manifest "$pattern" "$sub" "$REVIEW_DIR/scan-$name.txt"
}

if ! scans="$(profile_scans "$SCAN_PROFILE")"; then
  echo "Unknown SCAN_PROFILE: $SCAN_PROFILE" >&2
  echo "Valid: architecture, trust, domain-invariants, contracts, validation-testability, pii-data, async-reliability, migration-data-evolution, operations-readiness, data-lifecycle-retention, frontend-state-interaction, accessibility-mobile, dev-experience-reproducibility" >&2
  exit 1
fi

for scan in $scans; do
  run_scan "$scan"
done

echo "Scans complete:"
ls -1 "$REVIEW_DIR"/scan-*.txt 2>/dev/null | sed "s|^$REVIEW_DIR/||" || true
