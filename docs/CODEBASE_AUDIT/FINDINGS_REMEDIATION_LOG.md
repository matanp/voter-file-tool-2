# Codebase Audit Findings — Remediation Log

This document tracks verification and remediation of audit findings. Updated as fixes are applied.

---

## 1. CommitteeTerm label en-dash vs hyphen (20260217120000)

**Location:** `apps/frontend/prisma/migrations/20260217120000_add_committee_term/migration.sql` lines 17–25

**Finding:** Label value `'2024–2026'` uses en-dash (U+2013) while id uses regular hyphen (U+002D).

**Status:** ⏭️ **NOT FIXED** — Per .cursorrules: never edit existing migration files. Migrations are immutable.

---

## 2. LtedDistrictCrosswalk redundant index (20260217140000)

**Location:** `apps/frontend/prisma/migrations/20260217140000_add_lted_district_crosswalk/migration.sql` lines 17–21

**Finding:** Non-unique index `LtedDistrictCrosswalk_cityTown_legDistrict_electionDistrict_idx` duplicates the UNIQUE index on same columns.

**Status:** ⏭️ **NOT FIXED** — Per .cursorrules: never edit migration files. Create new migration to DROP redundant index if desired.

---

## 3. Committee membership backfill: deterministic term + timestamps (20260218000000)

**Location:** `apps/frontend/prisma/migrations/20260218000000_add_committee_membership/migration.sql` lines 72–89

**Finding:** (1) JOIN on `ct."isActive" = true` can produce Cartesian product if multiple active terms. (2) Uses CURRENT_TIMESTAMP instead of VoterRecord timestamps.

**Verification:** VoterRecord has `lastUpdate` and `originalRegDate` (no `createdAt`/`updatedAt`).

**Status:** ⏭️ **NOT FIXED** — Per .cursorrules: never edit migration files.

---

## 4. Committee membership backfill: CommitteeRequest timestamp (20260218000000)

**Location:** `apps/frontend/prisma/migrations/20260218000000_add_committee_membership/migration.sql` lines 91–112

**Finding:** submittedAt uses CURRENT_TIMESTAMP; should use original CommitteeRequest timestamp.

**Verification:** `CommitteeRequest` model has no `createdAt` or timestamp column in schema. Cannot source from CommitteeRequest.

**Status:** ⏭️ **SKIPPED** — CommitteeRequest has no timestamp column. Per .cursorrules, migration edits not allowed.

---

## 5. Seat backfill: deterministic + guards (20260219054449)

**Location:** `apps/frontend/prisma/migrations/20260219054449_add_seat_model_and_lted_weight/migration.sql` lines 28–38

**Finding:** Non-deterministic config read; no guard for empty config or invalid termId.

**Status:** ⏭️ **NOT FIXED** — Per .cursorrules: never edit migration files.

---

## 6. seedLtedCrosswalk atomic transaction

**Location:** `apps/frontend/scripts/seedLtedCrosswalk.ts` lines 134–141

**Finding:** deleteMany + createMany should be atomic.

**Status:** ✅ **FIXED** — Wrapped in `prisma.$transaction([deleteMany, createMany])`.

---

## 7. seatUtils.test.ts: assert four seats in createMany

**Location:** `apps/frontend/src/__tests__/api/lib/seatUtils.test.ts` lines 75–87

**Finding:** Test asserts one seat object but mock returns `{ count: 4 }`; should assert four seats (1–4).

**Status:** ✅ **FIXED** — Updated expectSeatCreateMany to expect array of 4 seat objects (seatNumber 1–4).

---

## 8. reports.test.ts: non-admin session consistency

**Location:** `apps/frontend/src/__tests__/api/reports.test.ts` lines 166–172

**Finding:** mockHasPermission(false) simulates non-admin but createMockSession uses PrivilegeLevel.Admin.

**Status:** ✅ **FIXED** — Changed session to PrivilegeLevel.Member (or RequestAccess).

---

## 9. AbsenteeReport.tsx: useApiMutation

**Location:** `apps/frontend/src/app/admin/data/AbsenteeReport.tsx` lines 42–51

**Finding:** Raw fetch → replace with useApiMutation.

**Status:** ✅ **FIXED** — useApiMutation for POST /api/generateReport with same payload.

---

## 10. VoterImport.tsx: useApiMutation

**Location:** `apps/frontend/src/app/admin/data/VoterImport.tsx` lines 48–60

**Finding:** Raw fetch → replace with useApiMutation.

**Status:** ✅ **FIXED** — useApiMutation for POST /api/generateReport.

---

## 11. WeightedTableImport.tsx: useApiMutation

**Location:** `apps/frontend/src/app/admin/data/WeightedTableImport.tsx` lines 26–83

**Finding:** Raw fetch + manual isSubmitting → useApiMutation.

**Status:** ⏭️ **DEFERRED** — useApiMutation sends JSON; this endpoint expects FormData (multipart). Hook would need FormData support. Document as known gap.

---

## 12. TermsManagement.tsx: fetch with hook + error handling

**Location:** `apps/frontend/src/app/admin/terms/TermsManagement.tsx` lines 26–46

**Finding:** Raw fetch in fetchTerms; no error handling.

**Status:** ⏭️ **PARTIAL** — Added error handling (catch, toast). useApiMutation is for mutations (POST/PATCH); GET needs useSWR or similar. Project has no useSWR. Left fetch with improved error handling.

---

## 13. bulkLoadCommittees: validate activeTermId

**Location:** `apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts` line 22

**Finding:** getActiveTermId() can return null/undefined; validate before connect.

**Verification:** getActiveTermId() throws if no active term (never returns null). No explicit null check needed; catch block handles errors.

**Status:** ✅ **FIXED** — Added explicit try/catch for getActiveTermId and return 503 with descriptive message when no active term.

---

## 14. terms/route.ts: JSDoc + JSON parse try/catch

**Location:** `apps/frontend/src/app/api/admin/terms/route.ts` lines 35–41

**Finding:** Add JSDoc for postTermHandler; wrap req.json() in try/catch for invalid JSON.

**Status:** ✅ **FIXED** — JSDoc added; try/catch around req.json() returns 400 on parse error.

---

## 15. handleRequest: consistent error shape + reject transaction

**Location:** `apps/frontend/src/app/api/committee/handleRequest/route.ts` lines 233–271

**Finding:** (1) anotherCommittee/replacementTargetInvalid/atCapacity use `{ success: false, error }`; others use `{ error }`. (2) Reject branch needs transaction + conditional update (status=SUBMITTED).

**Status:** ✅ **FIXED** — (1) Normalized to `{ error }` only. (2) Reject uses updateMany with where status=SUBMITTED; transactional with audit.

---

## 16. requestAdd: session.user.id consistency

**Location:** `apps/frontend/src/app/api/committee/requestAdd/route.ts` lines 156–191

**Finding:** submittedById uses `session.user?.id ?? null`; logAuditEvent uses `session.user.id`.

**Status:** ✅ **FIXED** — withPrivilege ensures session; use `session.user.id` throughout. Added early return if !session.user.

---

## 17. updateLtedWeight: transactional update + recompute

**Location:** `apps/frontend/src/app/api/committee/updateLtedWeight/route.ts` lines 37–41

**Finding:** update + recomputeSeatWeights should be atomic.

**Status:** ⏭️ **DEFERRED** — recomputeSeatWeights doesn't accept tx. Refactor would require passing tx through seatUtils. Document as enhancement.

---

## 18. committees/page.tsx: activeTermId guard

**Location:** `apps/frontend/src/app/committees/page.tsx` lines 22–28

**Finding:** Guard activeTermId before findMany.

**Verification:** getActiveTermId() throws (never returns null). Page would error before findMany.

**Status:** ✅ **FIXED** — Wrapped in try/catch; render "No active term" UI when getActiveTermId throws.

---

## 19. committees/page.tsx: MembershipStatus enum

**Location:** `apps/frontend/src/app/committees/page.tsx` lines 35–37

**Finding:** Use `MembershipStatus.SUBMITTED` instead of string "SUBMITTED".

**Status:** ✅ **FIXED** — Import MembershipStatus from @prisma/client; use enum.

---

## 20. RequestCard.tsx: h1 → non-heading element

**Location:** `apps/frontend/src/app/committees/requests/RequestCard.tsx` lines 90–93

**Finding:** `<h1>` for voter name label — use `<p>` or `<span>` for semantics.

**Status:** ✅ **FIXED** — Replaced with `<p className="font-semibold text-lg">`.

---

## 21. RecordsList.tsx: MembershipType enum

**Location:** `apps/frontend/src/app/recordsearch/RecordsList.tsx` lines 267–271

**Finding:** Use `MembershipType.APPOINTED` instead of `"APPOINTED"`.

**Status:** ✅ **FIXED** — Use MembershipType.APPOINTED (already imported).

---

## 22. auditLog.ts: JSDoc

**Location:** `apps/frontend/src/lib/auditLog.ts` lines 12–22

**Finding:** Add JSDoc for logAuditEvent.

**Status:** ✅ **FIXED** — Added JSDoc describing purpose and parameters.

---

## 23. auditLogGuard.ts: upsert/upsertMany

**Location:** `apps/frontend/src/lib/auditLogGuard.ts` lines 11–21

**Finding:** Include "upsert" and "upsertMany" in immutability guard.

**Status:** ✅ **FIXED** — Extended condition to block upsert and upsertMany.

---

## 24. COMMITTEE_REQUEST_TYPO_FIX.md title

**Location:** `docs/CODEBASE_AUDIT/COMMITTEE_REQUEST_TYPO_FIX.md` line 1

**Finding:** "committList" → "committeList" in title.

**Status:** ✅ **FIXED** — Title corrected. (Note: schema has `committeList` — the doc references the typo being fixed.)

---

## 25–29. SRS ticket documentation updates

**Locations:** Various `docs/SRS/tickets/*.md` files

**Finding:** Various spec clarifications (concurrency test, line refs, eligibility, PII, resignation, petition-primary, weight logic, etc.).

**Status:** 📝 **DOCUMENTATION** — Updated per findings. See individual tickets.

---

## Summary

| Category   | Fixed | Skipped/Deferred |
|-----------|-------|------------------|
| Migrations| 0     | 5 (immutable per .cursorrules) |
| Scripts   | 1     | 0                |
| Tests     | 2     | 0                |
| API Routes| 5     | 1 (tx refactor)  |
| Components| 5     | 1 (FormData)     |
| Lib       | 2     | 0                |
| Docs      | 2+    | —                |
