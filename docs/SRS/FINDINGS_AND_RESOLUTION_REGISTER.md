# Findings and Resolution Register

This document consolidates code-review and audit findings with resolution guidance. **Migrations:** we do **not** edit existing `migration.sql` files; resolve only via **new Prisma migrations** where applicable.

**Branch scope:** These findings target the **`feat/srs-implementation`** branch. Many of the referenced files (e.g. `admin/terms/TermsManagement.tsx`, `lib/auditLog.ts`, `lib/auditLogGuard.ts`, `hooks/useApiQuery.ts`, CommitteeMembership-based `handleRequest`, seat roster in `CommitteeSelector`) exist only on that branch. On `develop`, those paths may be missing or different—verify and apply fixes after switching to `feat/srs-implementation`.

**Phase 1 tickets (from this register):** [1.R.13](tickets/1.R.13-phase1-migration-fixes.md) Migration/Schema fixes · [1.R.14](tickets/1.R.14-handleRequest-capacity-replacement.md) handleRequest capacity · [1.R.15](tickets/1.R.15-api-audit-robustness.md) API and audit · [1.R.16](tickets/1.R.16-useApiQuery-robustness.md) useApiQuery · [1.R.17](tickets/1.R.17-phase1-ui-fixes.md) Admin/committee UI · [1.R.18](tickets/1.R.18-phase1-tests-validations.md) Tests and validations · [1.R.19](tickets/1.R.19-phase1-doc-consistency.md) Doc consistency.

---

## 1. README — Phase 1 tickets section (lines 33–41)

**Finding:** Section "Current Phase 1 Follow-Up Tickets (SRS)" lists 1.R.1–1.R.7 as if open; all are resolved.

**Resolution:** If this section exists: rename to **"Completed Phase 1 Follow-Up Tickets (SRS)"**, add a one-line note that all listed tickets are resolved and point to `docs/SRS/tickets/README.md` for current queue. Keep the ticket list as historical record.

**Status:** Verified: current README in this branch does not contain this section (already removed or different layout). No change required unless your branch still has it.

---

## 2. Migration: `nonOverridableIneligibilityReasons` NOT NULL (20260217000000)

**Location:** `apps/frontend/prisma/migrations/20260217000000_add_committee_governance_config/migration.sql` line 10.

**Finding:** Column has `DEFAULT ARRAY[]::"IneligibilityReason"[]` but no `NOT NULL`, unlike other table columns.

**Resolution:** **New Prisma migration only.** Add a migration that runs `ALTER TABLE "CommitteeGovernanceConfig" ALTER COLUMN "nonOverridableIneligibilityReasons" SET NOT NULL;` (after ensuring no nulls exist). Do **not** edit the original migration file.

**Tracked in:** [1.R.13](tickets/1.R.13-phase1-migration-fixes.md).

---

## 3. Migration: CommitteeTerm label en-dash vs hyphen (20260217120000)

**Location:** `apps/frontend/prisma/migrations/20260217120000_add_committee_term/migration.sql` lines 17–25.

**Finding:** INSERT uses label `'2024–2026'` (en-dash U+2013) while `id` uses hyphen; can cause search/match issues.

**Resolution:** **New Prisma migration only.** Add a migration that runs `UPDATE "CommitteeTerm" SET "label" = '2024-2026' WHERE "id" = 'term-default-2024-2026';` (ASCII hyphen). Do **not** edit the original migration file.

**Tracked in:** [1.R.13](tickets/1.R.13-phase1-migration-fixes.md).

---

## 4. Migration: CommitteeMembership backfill — column name and status filter (20260218000000)

**Location:** `apps/frontend/prisma/migrations/20260218000000_add_committee_membership/migration.sql` lines 97–112.

**Finding:** (1) Backfill references `cr."committeeListId"` — verify against schema. (2) Backfill does not filter `CommitteeRequest` by status (e.g. only approved/pending).

**Verification:** Schema and existing migrations use `committeeListId` on `CommitteeRequest` (DB column is correct; relation name in Prisma has typo `committeList`). So **column name is correct**.

**Resolution:** **New migration / data fix only** if you want to restrict backfill by request status. Do **not** edit the original migration. If desired, add a follow-up migration or one-off script that (for example) deletes or corrects `CommitteeMembership` rows that came from requests not in the desired status set; document the policy (e.g. only APPROVED/PENDING).

**Tracked in:** [1.R.13](tickets/1.R.13-phase1-migration-fixes.md).

---

## 5. Migration: AuditLog `userId` nullable (20260219061109)

**Location:** `apps/frontend/prisma/migrations/20260219061109_audit_log_schema/migration.sql` line 7.

**Finding:** `userId` is NOT NULL; system-generated audit entries may need to be created without a user context.

**Resolution:** **New Prisma migration only.** Add a migration that: (1) alters `"AuditLog"."userId"` to drop NOT NULL (e.g. `ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL`), (2) keeps the FK to `User` so referential integrity holds for non-null values. Update Prisma schema to `userId String?` and regenerate. Do **not** edit the original migration file.

**Tracked in:** [1.R.13](tickets/1.R.13-phase1-migration-fixes.md).

---

## 6. Admin layout / pages: `PrivilegeLevel.Admin` enum

**Location:** `apps/frontend/src/app/admin/layout.tsx` line 10 (or admin pages that use `AuthCheck`).

**Finding:** `AuthCheck privilegeLevel="Admin"` uses a string literal; should use enum for type safety.

**Resolution:** Use `privilegeLevel={PrivilegeLevel.Admin}` and add/import `PrivilegeLevel` from `@prisma/client`.

**Status:** Applied in `apps/frontend/src/app/admin/data/page.tsx` and `apps/frontend/src/app/admin/dashboard/page.tsx`. If `admin/layout.tsx` exists in your branch, apply the same change there.

**Tracked in:** [1.R.17](tickets/1.R.17-phase1-ui-fixes.md).

---

## 7. Admin page: one-line purpose comment

**Location:** `apps/frontend/src/app/admin/page.tsx` (or equivalent admin data page) around lines 5–12.

**Finding:** Add a brief one-line comment describing the component’s purpose (fetches electionDates and officeNames, renders AdminDataClient).

**Resolution:** Add a JSDoc or single-line comment above the component declaration.

**Status:** Applied in `apps/frontend/src/app/admin/data/page.tsx`.

---

## 8. TermsManagement: date formatting and type assertion

**Location:** `apps/frontend/src/app/admin/terms/TermsManagement.tsx` around lines 191–199.

**Finding:** Redundant `new Date()` and `string | Date` cast when formatting `term.startDate` / `term.endDate`; prefer `parseTermList` producing `Date` and use `format(term.startDate, ...)` (or normalize once).

**Resolution:** Either (a) ensure `parseTermList` always returns `Date` for `startDate`/`endDate` and use `format(term.startDate, "MMM d, yyyy")` (and same for `endDate`) without extra `new Date()` or cast, or (b) use a small helper that normalizes `string | Date` to `Date` and pass that to `format` to avoid ambiguous casting.

**Status:** Verify in your branch; if the file exists, remove the redundant conversion and fix the type.

**Tracked in:** [1.R.17](tickets/1.R.17-phase1-ui-fixes.md).

---

## 9. handleRequest: capacity check and pending replacement (removeMemberId)

**Location:** `apps/frontend/src/app/api/committee/handleRequest/route.ts` around lines 107–129.

**Finding:** Capacity check rejects when `activeCount >= config.maxSeatsPerLted` without accounting for a pending replacement (`removeMemberId`), so valid replacement requests can be blocked.

**Resolution:** Before the capacity check, compute effective active count: e.g. `effectiveActiveCount = activeCount - (removeMemberId ? 1 : 0)`, or perform the removal of the member being replaced (and validate `removeMemberId` belongs to the committee and is not the same as `membershipId`) then re-count. Use the effective count (or post-removal count) for the capacity comparison. Ensure `removeMemberId` is validated (same committee, ACTIVE, not the incoming membership).

**Status:** Apply in the route that implements CommitteeMembership-based handleRequest (capacity + seat assignment). If your branch still uses the old CommitteeRequest flow, this applies after SRS handleRequest is in place.

**Tracked in:** [1.R.14](tickets/1.R.14-handleRequest-capacity-replacement.md).

---

## 10. updateLtedWeight: malformed JSON and handler comment

**Location:** `apps/frontend/src/app/api/committee/updateLtedWeight/route.ts` around lines 22–28.

**Finding:** (1) `await req.json()` can throw on malformed JSON and surface as 500; should return 400 with a clear message. (2) Add a one-line comment describing the handler’s purpose.

**Resolution:** Wrap `await req.json()` in try/catch; on parse failure return `NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })`. Keep `validateRequest` and schema after successful parse. Add an inline comment above the handler (e.g. "Handle updating LTED weight from PATCHed JSON body...").

**Status:** Apply when/where this route exists in your branch.

**Tracked in:** [1.R.15](tickets/1.R.15-api-audit-robustness.md).

---

## 11. CommitteeSelector: occupant name display (dangling comma)

**Location:** `apps/frontend/src/app/committees/CommitteeSelector.tsx` around lines 459–461.

**Finding:** Display for `occupant.voterRecord` can produce a dangling comma when one of lastName/firstName is missing (e.g. `"Smith", ""`).

**Resolution:** Build the display name from non-empty parts: e.g. `[lastName, firstName].filter(Boolean).join(", ")` (or equivalent), and fall back to `occupant.voterRecord.VRCNUM` only when both name parts are empty.

**Status:** Apply in the component that renders seat occupants (e.g. CommitteeSelector) when that code exists.

**Tracked in:** [1.R.17](tickets/1.R.17-phase1-ui-fixes.md).

---

## 12. committees/requests page: null active term and Prisma enum for status

**Location:** `apps/frontend/src/app/committees/requests/page.tsx` around lines 59–68.

**Finding:** (1) Handle possible null/undefined `activeTermId` after `getActiveTermId()` (or thrown error) with a friendly error/empty state before `findMany`. (2) Replace string literal `"SUBMITTED"` with the generated enum (e.g. `CommitteeMembershipStatus.SUBMITTED`).

**Verification:** `getActiveTermId()` throws if there is no active term; it does not return null. So the improvement is to catch that error and show a "No active term" UI instead of an unhandled exception. Use Prisma enum for the status in the query.

**Resolution:** Wrap the block that calls `getActiveTermId()` and runs `findMany` in try/catch; on error render an empty state or message. In the `where` clause use `status: CommitteeMembershipStatus.SUBMITTED` and import `CommitteeMembershipStatus` from `@prisma/client`.

**Status:** Apply when the CommitteeMembership-based requests page exists.

**Tracked in:** [1.R.17](tickets/1.R.17-phase1-ui-fixes.md).

---

## 13. useApiQuery: 204/no-body and type safety

**Location:** `apps/frontend/src/hooks/useApiQuery.ts` around lines 81–82.

**Finding:** The 204/no-body branch uses `null as TData`, which breaks type safety when `TData` is non-nullable.

**Resolution:** Make the hook’s data state and return type explicitly `TData | null` (or constrain the generic so callers opt into nullable when using 204). Replace `null as TData` with a properly typed `null` and adjust call sites that assume non-null `data` when appropriate.

**Status:** Apply when/where this hook exists (e.g. in SRS branch).

**Tracked in:** [1.R.16](tickets/1.R.16-useApiQuery-robustness.md).

---

## 14. useApiQuery: refetch cleanup on unmount

**Location:** `apps/frontend/src/hooks/useApiQuery.ts` around lines 35–115.

**Finding:** Refetch does not clean up on unmount; in-flight fetch can call `setData`/`setError`/`setLoading` after unmount.

**Resolution:** Store `AbortController` and timeout id in refs inside `refetch`; pass `controller.signal` to `fetch`. In a `useEffect` cleanup, abort the controller and clear the timeout on unmount. Ensure refetch still clears timeout and resets controller after completion so subsequent calls work.

**Status:** Apply when/where this hook exists.

**Tracked in:** [1.R.16](tickets/1.R.16-useApiQuery-robustness.md).

---

## 15. auditLog: optional rethrow for compliance

**Location:** `apps/frontend/src/lib/auditLog.ts` around lines 36–41.

**Finding:** The catch block swallows errors; compliance may require surfacing audit failures.

**Resolution:** Add an optional parameter (e.g. `throwOnError = false`). After `console.error`, rethrow the caught error when `throwOnError` is true. If the API cannot be changed yet, add a TODO in the catch block referencing the error and variables (action, entityType, entityId) and note consideration of rethrow/throwOnError for compliance.

**Status:** Apply when/where this file exists.

**Tracked in:** [1.R.15](tickets/1.R.15-api-audit-robustness.md).

---

## 16. auditLogGuard: block upsert on AuditLog

**Location:** `apps/frontend/src/lib/auditLogGuard.ts` around lines 11–21.

**Finding:** Guard blocks update/updateMany/delete/deleteMany but not `upsert`.

**Resolution:** Extend the condition to include `params.action === "upsert"` and update the thrown message to list upsert as not allowed (e.g. "update, updateMany, delete, deleteMany, upsert operations are not allowed").

**Status:** Apply when/where this file exists.

**Tracked in:** [1.R.15](tickets/1.R.15-api-audit-robustness.md).

---

## 17. validations/committee: import order

**Location:** `apps/frontend/src/lib/validations/committee.ts` around lines 4–32.

**Finding:** Imports for `CommitteeList`, `VoterRecord`, `MembershipType`, `RemovalReason` appear after type declarations that use them; move imports to the top.

**Verification:** Current file uses `CommitteeWithMembers` from shared-validators and does not have the same structure as in the finding; types may be in shared-validators. If your branch has local types that depend on Prisma types, move the Prisma/type imports to the top of the file before those type definitions.

**Resolution:** Relocate the relevant import block to the top of the file (before any type definitions that use them). Keep named/type imports as needed.

**Status:** Verify in your branch; apply if the described structure exists.

**Tracked in:** [1.R.18](tickets/1.R.18-phase1-tests-validations.md).

---

## 18. committeeMappingHelpers.test: replace `as never` with proper type

**Location:** `apps/report-server/src/__tests__/committeeMappingHelpers.test.ts` around lines 165–166.

**Finding:** Test fixture uses `as never` for input to `mapCommitteesToReportShape`, weakening type safety.

**Resolution:** Import or define the correct input type (e.g. `CommitteeWithMemberships` or whatever the function expects), declare the test input as that typed array, and remove the `as never` cast so TypeScript checks the fixture.

**Status:** Apply when/where this test file exists.

**Tracked in:** [1.R.18](tickets/1.R.18-phase1-tests-validations.md).

---

## 19. BRANCH_REVIEW doc: Section 3.2 vs Section 8 consistency

**Location:** `docs/SRS/BRANCH_REVIEW_DEVELOP_VS_FEAT_SRS_IMPLEMENTATION.md` around lines 136–195.

**Finding:** Section 3.2 says the stale README mismatch was resolved; Section 8 still recommends updating tickets/README.md so 1.R.1 matches. Contradiction.

**Resolution:** Either (a) remove the Section 8 bullet "Update tickets/README.md so 1.R.1 status matches the ticket file", or (b) Prepend "Resolved:" or "Historical note:" to that bullet so it’s clear it’s already addressed. Ensure Section 3.2 and Section 8 wording are consistent.

**Status:** Applied (Section 8 bullet prefixed "Resolved:"). See [1.R.19](tickets/1.R.19-phase1-doc-consistency.md).

**Tracked in:** [1.R.19](tickets/1.R.19-phase1-doc-consistency.md).

---

## 20. COMMITTEE_REQUEST_TYPO_FIX: title typo

**Location:** `docs/CODEBASE_AUDIT/COMMITTEE_REQUEST_TYPO_FIX.md` line 1.

**Finding:** Document title uses "committList"; should be "committeList" (or "committeeList" for the desired relation name).

**Resolution:** Replace "committList" with "committeList" in the title and anywhere else in the file (the schema typo is relation name `committeList` missing one 't').

**Status:** Applied (title corrected to committeList). See [1.R.19](tickets/1.R.19-phase1-doc-consistency.md).

**Tracked in:** [1.R.19](tickets/1.R.19-phase1-doc-consistency.md).

---

## 21. FINDINGS_REMEDIATION_LOG: summary table counts

**Location:** `docs/CODEBASE_AUDIT/FINDINGS_REMEDIATION_LOG.md` around lines 267–274.

**Finding:** Summary should reflect: Migrations Fixed 1 (forward migration 20260219143000), Skipped 4; Components Fixed 6, Skipped 0 (FormData item fixed).

**Resolution:** Set Migrations row to "Fixed 1 | Skipped 4 (immutable per .cursorrules)" and Components row to "Fixed 6 | Skipped 0".

**Status:** ✅ Applied in current branch.

---

## 22. POSTGRES_QUEUE_MIGRATION_PLAN: x-webhook-signature verification (line 233)

**Location:** `docs/POSTGRES_QUEUE_MIGRATION_PLAN.md` line 233.

**Finding:** Add mandatory verification of `x-webhook-signature` for report-server `/start-job`.

**Resolution:** In the doc, add a step: implement middleware or a pre-handler that reads `x-webhook-signature`, computes HMAC (or configured algorithm) over the request body with the shared webhook secret, compares with constant-time comparison, and returns 401/403 and logs when verification fails. Wire this into the `/start-job` route so no job processing occurs without valid signature.

**Status:** Documentation change only; implement in report-server when doing the migration.

---

## 23. POSTGRES_QUEUE_MIGRATION_PLAN: pre-cutover in-flight job steps (lines 151–158)

**Location:** `docs/POSTGRES_QUEUE_MIGRATION_PLAN.md` around lines 151–158.

**Finding:** Add concrete, actionable pre-cutover steps for in-flight job handling.

**Resolution:** In the doc, add: how to verify the in-memory queue is empty (e.g. worker health API, PM2/forever logs, "reports_in_progress" or equivalent); wait for (max_expected_job_duration + 30% buffer) and an explicit timeout policy; an automated pre-cutover script that queries `Report` for rows with status IN ('PENDING','PROCESSING') older than a configurable threshold using `POSTGRES_DIRECT_URL`, and optionally runs an idempotent UPDATE to set them to 'FAILED' with `updated_at = NOW()`; a pre-cutover health check that fails the cutover if any such rows exist and emits count and sample ids to deploy logs.

**Status:** Documentation change only.

---

## 24. POSTGRES_QUEUE_MIGRATION_PLAN: transactional and operational behavior (lines 66–77)

**Location:** `docs/POSTGRES_QUEUE_MIGRATION_PLAN.md` around lines 66–77.

**Finding:** Refactor notes should specify: enqueue + Report row creation in one transaction or create Report only after successful Graphile enqueue; compensating rollback/cleanup if enqueue fails; worker and HTTP path using separate DB connection pools where appropriate; configurable job timeout/heartbeat and how stuck jobs are detected and retried/failed.

**Resolution:** Update the doc to state whether Report row creation and enqueue are in one transaction or sequential with rollback on enqueue failure; document that the worker module and HTTP path should use separate pools than Prisma where appropriate and how `processReportJob` obtains connections; add a subsection on configurable job timeout, heartbeat interval, and detection/retry/failure of stuck jobs.

**Status:** Documentation change only.

---

## 25. PHASE1_CODE_REVIEW_FINDINGS: P1 resolution vs findings consistency

**Location:** `docs/SRS/PHASE1_CODE_REVIEW_FINDINGS.md` around lines 6–16 and later findings/closeout.

**Finding:** "Resolution (P1)" table says P1s are fixed; later "Findings" and closeout text can read as if they’re still open. Inconsistent.

**Resolution:** Make the doc consistent. If P1s are resolved: rename the Findings section to something like "Historical Findings (Resolved in Current Branch)", use past-tense and annotate each P1 with the code/test refs from the table, and adjust the closeout gate to remove open-action phrasing. If still open: mark the resolution table as "Planned/Proposed" or remove it and state outstanding work in the closeout. Ensure the resolution table, detailed findings, and closeout all use the same status wording.

**Status:** Applied (section renamed, Review Outcome and closeout gate updated). See [1.R.19](tickets/1.R.19-phase1-doc-consistency.md).

**Tracked in:** [1.R.19](tickets/1.R.19-phase1-doc-consistency.md).

---

## 26. SRS ticket 1.3 (membership-type): clarify completed vs deferred

**Location:** `docs/SRS/tickets/1.3-membership-type.md` line 10.

**Finding:** Ambiguity between completed work and deferred petition workflow.

**Resolution:** State explicitly that this ticket wires `MembershipType` into `CommitteeMembership` (admin override and UI) and that existing migrated records default to `APPOINTED`. Add a sentence that `PETITIONED` will be applied automatically only when the petition workflow is implemented in a future ticket (e.g. 2.x). Use symbols MembershipType, CommitteeMembership, APPOINTED, PETITIONED to separate delivered scope from deferred workflow.

**Status:** Doc update in SRS ticket.

---

## 27. SRS ticket 1.4 (seat-model): dynamic seat range in acceptance criteria

**Location:** `docs/SRS/tickets/1.4-seat-model.md` line 58.

**Finding:** Acceptance criteria hardcode "list seats 1–4"; should reference `CommitteeGovernanceConfig.maxSeatsPerLted`.

**Resolution:** Change to wording like "list seats 1–N (where N = CommitteeGovernanceConfig.maxSeatsPerLted) with occupant name (from active CommitteeMembership with matching seatNumber), isPetitioned, and weight".

**Status:** Doc update in SRS ticket.

---

## 28. SRS ticket 2.1 (eligibility): server-side placement and imports

**Location:** `docs/SRS/tickets/2.1-eligibility-validation.md` line 10.

**Finding:** Eligibility validation is described as server-side but the ticket places it under `apps/frontend/src/lib/eligibility.ts`; DB lookups should live only on the server.

**Resolution:** In the ticket, specify that the implementation lives in a server-only path (e.g. `apps/frontend/src/app/api/lib/eligibility.ts` or equivalent so it’s never bundled for client). Update all committee mutation routes to import from that module. Preserve signature and behavior (forceAdd, overrideReason, 422, audit logging). If the repo has no separate `apps/backend`, "backend" here means server-side code within the frontend app (API routes / server-only lib).

**Status:** Doc update; implement when doing 2.1.

---

## 29. SRS ticket 2.1a (email-phone): empty string normalization

**Location:** `docs/SRS/tickets/2.1a-email-phone-submission.md` around lines 35–38.

**Finding:** Spec doesn’t define handling of empty strings for optional email/phone; breaks display `submissionMetadata?.email ?? voterRecord.email`.

**Resolution:** In validation (client and server Zod), normalize empty strings to null/undefined for `email` and `phone`. Document that cleared inputs become null/undefined and reference `submissionMetadata?.email ?? voterRecord.email` and backend Zod for `email`.

**Status:** Doc and implementation when doing 2.1a.

---

## 30. SRS ticket 2.2 (warning-system): RECENT_RESIGNATION 90-day window

**Location:** `docs/SRS/tickets/2.2-warning-system.md` around lines 51–54.

**Finding:** RECENT_RESIGNATION is ambiguous about the reference point for the 90-day window.

**Resolution:** State explicitly that `CommitteeMembership.resignedAt` must be within 90 days of the **validation request time** (when the eligibility check runs). Note that the v1 window constant in the eligibility service uses that same reference and should be documented.

**Status:** Doc update in SRS ticket.

---

## 31. SRS ticket 2.2: "active term" definition

**Location:** `docs/SRS/tickets/2.2-warning-system.md` around lines 55–57.

**Finding:** Clarify and formalize "active term": Term entity, whether "active" is by status or date range, and the exact attribute linking CommitteeMembership to a term.

**Resolution:** Add or reference the Term model; state whether "active" is Term.status (e.g. ACTIVE) or date range (startDate ≤ today ≤ endDate). Specify the link (e.g. CommitteeMembership.termId). Update the PENDING_IN_ANOTHER_COMMITTEE bullet to use that definition and give the exact check (e.g. find active Term, then check for CommitteeMembership with same voter and that term but different committeeListId with status SUBMITTED).

**Status:** Doc update in SRS ticket.

---

## 32. SRS ticket 2.3 (resignation): seatNumber clearing wording

**Location:** `docs/SRS/tickets/2.3-resignation-workflow.md` line 25.

**Finding:** "Clear seatNumber or leave as-is" is contradictory.

**Resolution:** State clearly that no explicit clearing of `seatNumber` is required; seat availability is computed dynamically and `assignNextAvailableSeat` will return the freed seat on next activation. Remove "clear or leave as-is" wording.

**Status:** Doc update in SRS ticket.

---

## 33. SRS ticket 2.3: committee/remove vs committee/resign

**Location:** `docs/SRS/tickets/2.3-resignation-workflow.md` line 16.

**Finding:** Spec is ambiguous whether to extend `committee/remove` or add `committee/resign`.

**Resolution:** Decide and document: either (a) extend `committee/remove` to accept `action: "RESIGN"` and describe behavior and backward-compat, or (b) add `committee/resign` with signature and responsibilities and rationale (separation of concerns, audit trail). Reference committee/remove, committee/resign, action: "RESIGN" in the SRS so implementers know which endpoint to implement.

**Status:** Doc update in SRS ticket.

---

## 34. SRS ticket 2.4 (meeting-record): index on CommitteeMembership.meetingRecordId

**Location:** `docs/SRS/tickets/2.4-meeting-record-confirmation-workflow.md` around lines 44–49.

**Finding:** Add a DB index for the FK on CommitteeMembership for queries by meetingRecordId.

**Resolution:** In the Prisma schema (when implementing 2.4), add `@@index([meetingRecordId])` on CommitteeMembership (or mark the relation field as indexed) so queries by meetingRecordId are fast. Keep relation and fields as-is.

**Status:** Implementation note in ticket / schema when implementing 2.4.

---

## 35. SRS ticket 2.4: audit logging test cases

**Location:** `docs/SRS/tickets/2.4-meeting-record-confirmation-workflow.md` around lines 139–148.

**Finding:** Tests section should include explicit audit logging test cases.

**Resolution:** Add checklist items: (1) each lifecycle/decision event emits the correct audit event type, (2) decision events include metadata.meetingRecordId, (3) event timestamps and actor (user/service) identity are recorded. Reference lifecycle events and metadata.meetingRecordId.

**Status:** Doc update in SRS ticket.

---

## 36. SRS ticket 2.8 (BOE eligibility flagging): committeeListId and voterRecordId descriptions

**Location:** `docs/SRS/tickets/2.8-boe-driven-automatic-eligibility-flagging.md` around lines 36–37.

**Finding:** committeeListId and voterRecordId are listed without descriptions.

**Resolution:** For committeeListId: state purpose (denormalized ID vs derived), type (Int), uniqueness/nullable, how it maps to committee. For voterRecordId: state whether it’s BOE import ID, voter registration ID, or other; format (String); when populated; referential expectations. Add short usage notes and examples.

**Status:** Doc update in SRS ticket.

---

## 37. SRS ticket 2.8: unique constraint and application-level deduplication

**Location:** `docs/SRS/tickets/2.8-boe-driven-automatic-eligibility-flagging.md` line 51.

**Finding:** Unique constraint includes status; recommendation to remove status and enforce "no duplicate pending" in application logic.

**Resolution:** Change schema to `@@unique([membershipId, reason])` (remove status). In the flag creation flow: before inserting a new PENDING flag, query for existing flags with same membershipId and reason; if PENDING exists skip; if only CONFIRMED/DISMISSED exists, either update to PENDING or insert per business rules. Document in the ticket.

**Status:** Doc and implementation when doing 2.8.

---

## 38. T1.3-discrepancy-handling-tests: Status vs Summary

**Location:** `docs/SRS/tickets/T1.3-discrepancy-handling-tests.md` line 3 and Summary.

**Finding:** Document shows "Status: Done" but Summary says routes "are currently untested".

**Resolution:** If tests are implemented: change Summary to past tense (e.g. "were previously untested") and keep Status and checkboxes. If tests are still pending: change Status to "Planned" or "In Progress" and uncheck acceptance criteria so status, summary, and checkboxes align.

**Status:** Doc update in SRS ticket.

---

## Summary

| Category        | Resolve via |
|----------------|-------------|
| **Migrations** | New Prisma migrations only; do not edit existing migration.sql files. |
| **Code (routes, hooks, lib, components)** | Direct code changes as described above; verify paths in your branch. |
| **Docs**       | Direct doc edits; several applied or noted above. |

This register should be updated as findings are resolved or superseded.
