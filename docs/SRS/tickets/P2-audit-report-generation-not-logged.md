# P2 — `REPORT_GENERATED` and `TERM_CREATED` Are Declared but Never Written

**Status:** Open
**Priority:** P2 — Medium (P1 if report generation is in audit scope for compliance sign-off)
**Effort:** 0.5–1 day
**Source:** Review of the audit-trail record-type relabeling change (2026-07-29)
**Depends on:** [1.5 Audit Trail Infrastructure](1.5-audit-trail-infrastructure.md), [1.5c Audit Log Route Wiring](1.5c-audit-log-route-wiring.md)
**Related (do not duplicate):** [1.R.20 Admin Flow Audit Coverage](1.R.20-admin-flow-audit-coverage.md) (Resolved) — that ticket closed the *membership-flow* audit gaps; this one is about report generation and term creation, which it did not cover.

## Problem

Two `AuditAction` values are fully wired up on the read side and never produced on the write side:

| Action | Declared | Labeled | `buildSummary` branch | Written by any code path |
| --- | --- | --- | --- | --- |
| `REPORT_GENERATED` | `prisma/schema.prisma:67` | `auditUtils.ts:14` | `auditUtils.ts:320` | **No** |
| `TERM_CREATED` | `prisma/schema.prisma:68` | `auditUtils.ts:15` | `auditUtils.ts:324` | **No** |

Verified by enumerating every `logAuditEvent` / `logAuditEventOrThrow` call site across `apps/` and
`packages/`. Exactly eight entity types are ever written — `CommitteeMembership`,
`CommitteeUploadDiscrepancy`, `MeetingRecord`, `CommitteeGovernanceConfig`, `UserJurisdiction`,
`EligibilityFlag`, `LtedDistrictCrosswalk`, `Seat` — and neither `Report` nor `CommitteeTerm` is
among them.

The two write paths that should be emitting these events do not:

- **Report generation** — `apps/frontend/src/app/api/generateReport/route.ts:92` creates the
  `Report` row and dispatches the job with no audit call anywhere in the request, the
  `reportComplete` callback (`apps/frontend/src/app/api/reportComplete/route.ts`), or the
  `reportJobs` route.
- **Term creation** — `apps/frontend/src/app/api/admin/terms/route.ts:76` creates the
  `CommitteeTerm` with no audit call.

## Why this matters

**Report generation is the app's main PII egress point.** A generated report can contain a
committee roster or voter-level data for a whole jurisdiction. "Who pulled which voter data, and
when" is exactly the question an audit trail exists to answer, and today it cannot be answered from
the audit trail at all.

The `Report` table is not an adequate substitute:

1. **It is mutable by the person being audited.** `Report.deleted` is a soft-delete flag and
   `DELETE /api/reports/[id]` (`apps/frontend/src/app/api/reports/[id]/route.ts:211`) lets the
   report's own owner set it. `AuditLog`, by contrast, is protected by
   `auditLogImmutabilityGuard` — updates and deletes throw. The only durable record of a report
   pull is one the puller can hide.
2. **It does not capture scope.** `Report` stores `generatedById`, `ReportType`, `title`, and
   `description`, but not the jurisdiction/scope arguments the request was validated against in
   `validateReportJurisdictionAccess` (`generateReport/route.ts:76`). "Leader X ran a roster
   report" is recorded; "…for LD 12, which they had access to at the time" is not.
3. **It is not on the audit surface.** Admins investigating an incident go to `/admin/audit`. Report
   activity is invisible there, and absent from the CSV/XLSX export an auditor is handed.

**Empty filters are a false negative, not a blank.** Until this is fixed, the audit UI must not
offer "Report" / "Committee term" record types or imply those actions are covered. An admin who
filters to Report and sees an empty table reads it as *no reports were generated*, not *report
generation is not recorded*. The `Report` and `CommitteeTerm` options were therefore removed from
`AUDIT_ENTITY_TYPE_OPTIONS` (`auditUtils.ts`), and `auditUtils.test.ts` now asserts in both
directions that the dropdown lists exactly the set of entity types that are actually logged. That
guard is a stopgap for the UI lie — it is not a fix for the missing coverage.

## Decisions needed before implementing

1. **Is report generation in audit scope?** If product says report pulls need not be audited,
   delete `REPORT_GENERATED` from the enum, its label, and its `buildSummary` branch rather than
   leaving dead machinery that implies coverage. Do not leave the current middle state.
2. **Which lifecycle point is the audit event?** Recommendation: **request time**, in
   `generateReport/route.ts` right after the `Report` row is created and jurisdiction validation has
   passed. That records the *attempt to extract data* with the requester's privilege level as of
   that moment, which is the compliance-relevant fact, and it survives a job that later fails.
   Logging only on `reportComplete` would miss failed/abandoned pulls and would have to attribute
   the event to the callback rather than a user session.
3. **How much of the report scope goes in metadata?** The scope arguments identify jurisdictions,
   not individual voters, so they are safe to store — but confirm against
   [`WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_claude-opus-4-8_2026-07-08.md`](../../WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_claude-opus-4-8_2026-07-08.md)
   that no search-criteria payload with voter identifiers ends up in `AuditLog.metadata`.
4. **Is `TERM_CREATED` still wanted?** Terms are admin-only reference data with a small blast
   radius. Either wire it up at `admin/terms/route.ts:76` (cheap, one call) or drop the enum value.
   Note the enum is shared with `CommitteeGovernanceConfig` auditing, which *is* logged — so
   "reference data is out of scope" is not a consistent reason to skip it.

## Proposed fix

```ts
// generateReport/route.ts, after prisma.report.create(...)
await logAuditEvent(
  session.user.id,
  userPrivilege,
  AuditAction.REPORT_GENERATED,
  "Report",
  report.id,
  null,
  { reportType, title: reportData.name },
  { scope: <validated jurisdiction scope>, requestedAt: report.requestedAt },
);
```

Use best-effort `logAuditEvent` (not `logAuditEventOrThrow`) so a logging failure cannot block a
report the user is entitled to — consistent with how the other non-membership call sites treat
reference/diagnostic events.

Then restore the two options in `AUDIT_ENTITY_TYPE_OPTIONS` and add the entity types to
`LOGGED_ENTITY_TYPES` in `auditUtils.test.ts`; the bidirectional assertions will fail until both
sides match, which is the intended forcing function.

## Acceptance criteria

- [ ] Product decision recorded for items 1 and 4 above (log it, or delete the enum value).
- [ ] If logging: `POST /api/generateReport` writes one `AuditLog` row per successful report request,
      with `entityType: "Report"`, the requester's ID and privilege level, and jurisdiction scope in
      metadata.
- [ ] The audit event is written for reports that later fail, and is not duplicated by
      `reportComplete`.
- [ ] `buildSummary` renders a useful one-liner for the new rows (branch already exists at
      `auditUtils.ts:320` — verify it against a real row rather than assuming).
- [ ] `Report` / `CommitteeTerm` restored to `AUDIT_ENTITY_TYPE_OPTIONS` **and** to
      `LOGGED_ENTITY_TYPES`, with both directions of the registry test passing.
- [ ] Route test covering the audit write, following the pattern in
      `src/__tests__/api/admin/audit.test.ts`.
- [ ] No voter-level PII in `AuditLog.metadata` for these events.

## Related

- [3.5 Audit Trail UI + Export](3.5-audit-trail-ui-export.md) — the surface that exposes the gap.
- [`WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_claude-opus-4-8_2026-07-08.md`](../../WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_claude-opus-4-8_2026-07-08.md)
  — report generation as a PII egress path.
