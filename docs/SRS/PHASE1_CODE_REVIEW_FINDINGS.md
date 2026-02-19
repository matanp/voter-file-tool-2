# Phase 1 Code Review Findings

**Date:** February 19, 2026  
**Scope:** `develop...feat/srs-implementation` (code + tests, not docs-only)

## Review Outcome

Phase 1 is **not fully finalizable** from a code-quality/risk perspective yet.

- **P1 findings:** 4
- **P2 findings:** 2

## What Was Reviewed

- Committee mutation flows:
  - `apps/frontend/src/app/api/committee/add/route.ts`
  - `apps/frontend/src/app/api/committee/requestAdd/route.ts`
  - `apps/frontend/src/app/api/committee/handleRequest/route.ts`
  - `apps/frontend/src/app/api/committee/remove/route.ts`
  - `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts`
  - `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts`
  - `apps/frontend/src/app/api/admin/weightedTable/import/route.ts`
- Shared utilities:
  - `apps/frontend/src/app/api/lib/committeeValidation.ts`
  - `apps/frontend/src/app/api/lib/seatUtils.ts`
- Key tests and remediation tickets.

## Test Runs

Ran focused suites:

```bash
pnpm --filter voter-file-tool test -- --runInBand \
  src/__tests__/api/committee/requestAdd.test.ts \
  src/__tests__/api/admin/handleCommitteeDiscrepancy.test.ts \
  src/__tests__/api/admin/bulkLoadCommittees.bulkLoadUtils.test.ts
```

All passed (43/43), but they do not cover several high-risk paths below.

---

## Findings (Ordered by Severity)

### 1. [P1] Resubmission can carry stale `removeMemberId` and remove the wrong active member

**Evidence**

- Resubmission merges previous metadata into new metadata:
  - `apps/frontend/src/app/api/committee/requestAdd/route.ts:183`
  - `apps/frontend/src/app/api/committee/requestAdd/route.ts:186`
- Accept flow uses `submissionMetadata.removeMemberId` to perform replacement removal:
  - `apps/frontend/src/app/api/committee/handleRequest/route.ts:140`
  - `apps/frontend/src/app/api/committee/handleRequest/route.ts:144`

**Impact**

If a prior rejected/removed request had a `removeMemberId`, later add-only resubmissions can still carry that stale value, causing an unintended member removal when admin accepts.

**Recommendation**

- On resubmission, rebuild `submissionMetadata` from current request intent rather than merging old blindly.
- If `removeMemberId` is absent, explicitly clear it.
- Add regression tests for:
  - prior replacement metadata + new add-only submission
  - explicit clearing behavior.

---

### 2. [P1] Discrepancy accept flow can create dual ACTIVE memberships across committees

**Evidence**

- No “active in another committee” guard in discrepancy accept flow:
  - `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts:63`
  - `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts:98`
- Equivalent guard exists in `add` route:
  - `apps/frontend/src/app/api/committee/add/route.ts:92`

**Impact**

A voter can become `ACTIVE` in multiple committees for the same term if discrepancy acceptance runs while they are already active elsewhere.

**Recommendation**

- Add the same hard-stop check used in `add`/`handleRequest` before activation.
- Return a structured 400 (same contract as other routes).
- Add tests for cross-committee active-member rejection in discrepancy accept.

---

### 3. [P1] Bulk import reconciliation can activate one voter in multiple committees in same term

**Evidence**

- Bulk import activates/creates memberships per committee without cross-committee active check:
  - `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts:230`
  - `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts:271`

**Impact**

If source file contains duplicate voter assignments across committees, the import can produce multiple `ACTIVE` memberships for one voter in the active term.

**Recommendation**

- Add explicit guard while activating/importing:
  - deactivate/move prior active membership for the same voter+term, or
  - reject and surface discrepancy requiring admin resolution.
- Add test coverage for duplicate voter across two committees in one import.

---

### 4. [P1] Weighted-table import matching key is ambiguous and can update wrong committees

**Evidence**

- Import matches by `(legDistrict, electionDistrict, termId)` only:
  - `apps/frontend/src/app/api/admin/weightedTable/import/route.ts:74`
  - `apps/frontend/src/app/api/admin/weightedTable/import/route.ts:79`
- It then updates all matched committees:
  - `apps/frontend/src/app/api/admin/weightedTable/import/route.ts:88`
- Spec/docs call for Matrix join and town/city mapping:
  - `docs/SRS/SRS_LTED_WEIGHT_SOURCE.md:111`
  - `docs/SRS/SRS_LTED_WEIGHT_SOURCE.md:121`

**Impact**

A single LTED row can update multiple committees that share LD/ED values across different towns, corrupting `ltedWeight`.

**Recommendation**

- Join weighted table with LTED Matrix (or otherwise resolve city/town mapping) and match on full `(cityTown, legDistrict, electionDistrict, termId)`.
- Add tests for ambiguous LD/ED across multiple cities.

---

### 5. [P2] Missing audit events for important membership-changing admin flows

**Evidence**

- No `logAuditEvent` usage in:
  - `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts`
  - `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts`
- Membership statuses are mutated in both flows.

**Impact**

Operational changes to committee membership can occur without audit records, reducing traceability and post-incident forensic quality.

**Recommendation**

- Add audit events for activation/removal transitions inside those transactions.
- Include metadata indicating source (`discrepancy_accept`, `bulk_import_sync`).

---

### 6. [P2] High-risk paths are under-tested

**Evidence**

- No tests found for weighted-table import route (`/api/admin/weightedTable/import`).
- Existing discrepancy/bulk tests do not cover cross-committee active-member constraints.

**Impact**

Regressions in Phase 1 invariants (single active committee membership, correct weight mapping) can slip through CI.

**Recommendation**

- Add route tests for weighted import matching correctness and conflict handling.
- Add negative tests for:
  - already-active-in-another-committee in discrepancy accept
  - duplicate voter assignments during bulk sync.

---

## Suggested Closeout Gate Before Phase 2

1. Fix findings 1–4 (all P1).  
2. Add/expand tests for those paths.  
3. Re-run API test suite for committee/admin mutation routes.  
4. Reconfirm ticket statuses after fixes (especially 1.R.4/1.R.5/1.R.7 closeout assumptions).
