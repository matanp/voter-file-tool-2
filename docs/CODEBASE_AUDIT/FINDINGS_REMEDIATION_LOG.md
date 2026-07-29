# Codebase Audit Findings — Remediation Log

This document tracks open (unresolved) audit findings. Fixed findings have been
removed. Original finding numbers are preserved for traceability. Last audited
against the codebase: 2026-07-04.

---

## 1. CommitteeTerm label en-dash vs hyphen (20260217120000)

**Location:** `apps/frontend/prisma/migrations/20260217120000_add_committee_term/migration.sql` lines 17–25

**Finding:** Label value `'2024–2026'` uses en-dash (U+2013) while id uses regular hyphen (U+002D).

**Status:** ⏭️ **WON'T FIX** — Per .cursorrules: never edit existing migration files. Migrations are immutable.

---

## 3. Committee membership backfill: deterministic term + timestamps (20260218000000)

**Location:** `apps/frontend/prisma/migrations/20260218000000_add_committee_membership/migration.sql` lines 72–89

**Finding:** (1) JOIN on `ct."isActive" = true` can produce Cartesian product if multiple active terms. (2) Uses CURRENT_TIMESTAMP instead of VoterRecord timestamps.

**Verification:** VoterRecord has `lastUpdate` and `originalRegDate` (no `createdAt`/`updatedAt`).

**Status:** ⏭️ **WON'T FIX** — Per .cursorrules: never edit migration files.

---

## 4. Committee membership backfill: CommitteeRequest timestamp (20260218000000)

**Location:** `apps/frontend/prisma/migrations/20260218000000_add_committee_membership/migration.sql` lines 91–112

**Finding:** submittedAt uses CURRENT_TIMESTAMP; should use original CommitteeRequest timestamp.

**Verification:** `CommitteeRequest` model has no `createdAt` or timestamp column in schema. Cannot source from CommitteeRequest.

**Status:** ⏭️ **WON'T FIX** — CommitteeRequest has no timestamp column. Per .cursorrules, migration edits not allowed.

---

## 5. Seat backfill: deterministic + guards (20260219054449)

**Location:** `apps/frontend/prisma/migrations/20260219054449_add_seat_model_and_lted_weight/migration.sql` lines 28–38

**Finding:** Non-deterministic config read (`LIMIT 1` with no ORDER BY); no guard for empty config or invalid termId.

**Status:** ⏭️ **WON'T FIX** — Per .cursorrules: never edit migration files.

---

## 31. Invite apply failure — unreachable `grant-failed` access-denied branch (2026-07-04)

**Location:** `apps/frontend/src/app/auth/access-denied/AccessDeniedContent.tsx` vs `apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts`

**Finding:** UI handles `?reason=grant-failed` (AccessDeniedContent.tsx line 29), but apply failures return JSON only (`{ error, reason: "grant-failed" }`, apply route line 131); nothing redirects with that query param, so the UI branch is unreachable.

**Status:** ⏭️ **DEFERRED** — Low risk. Wire redirect on apply failure or remove the dead branch when touching that flow.

---

## 32. PrivilegedUser sign-in invariant — no explicit test (2026-07-04)

**Location:** `apps/frontend/src/auth.ts` (`signIn` callback, lines 68–72)

**Finding:** Existing users not in `PrivilegedUser` are reset to `ReadAccess` on every sign-in. Seed/provisioning should always insert Developers/Admins into `PrivilegedUser`; no test asserts they survive sign-in.

**Status:** ⏭️ **DEFERRED** — Confirm seed coverage; add sign-in test if provisioning gaps are found.

---

## 33. `validateReportJurisdictionAccess` skips check when `cityTown` absent (pre-existing)

**Location:** `apps/frontend/src/app/api/lib/committeeValidation.ts` (line 230)

**Finding:** For non-admin jurisdiction scope, the match block is guarded by `&& input.cityTown`; missing `cityTown` returns granted. Defense-in-depth only if report routes always require `cityTown` when `scope === "jurisdiction"`.

**Status:** ⏭️ **DEFERRED** — Verify report route schemas require `cityTown` for jurisdiction scope.

---

## Summary

| # | Finding | Status |
|---|---------|--------|
| 1 | CommitteeTerm label en-dash vs hyphen | Won't fix (immutable migration) |
| 3 | Membership backfill: term join + timestamps | Won't fix (immutable migration) |
| 4 | Membership backfill: request timestamp | Won't fix (no source column) |
| 5 | Seat backfill: deterministic config + guards | Won't fix (immutable migration) |
| 31 | Unreachable `grant-failed` access-denied branch | Deferred |
| 32 | PrivilegedUser sign-in invariant — no test | Deferred |
| 33 | Jurisdiction check skipped when `cityTown` absent | Deferred |
</content>
</invoke>
