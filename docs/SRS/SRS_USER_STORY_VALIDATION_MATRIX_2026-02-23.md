# SRS v0.1 User Story Validation Matrix

> **Branch overview:** [FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md](FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md)

Date: 2026-02-23  
Updated: 2026-02-24 (post Tier 4 closeout)  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenarios 1-7)

Status legend:
- `Implemented`
- `Partially Implemented`
- `Implemented with Bugs/Risks`
- `Not Implemented`

## Scenario 1: Leader submits a new committee member

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Leader can search by VRN or name | Implemented | `apps/frontend/src/app/components/RecordSearchForm.tsx:74`, `apps/frontend/src/app/components/RecordSearchForm.tsx:81` | Supports voter ID, first name, last name search. |
| System displays voter details (name, address, Home ED, Assembly District) | Implemented | `apps/frontend/src/app/committees/EligibilitySnapshotPanel.tsx:46`, `apps/frontend/src/app/committees/AddCommitteeForm.tsx:322`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:305` | Eligibility snapshot now renders required voter/home-district context before submit. |
| System performs live checks (registered, party, AD, capacity) | Implemented | `apps/frontend/src/app/committees/AddCommitteeForm.tsx:156`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:117`, `apps/frontend/src/app/api/committee/eligibility/route.ts:66` | UI now calls preflight endpoint on candidate and committee selection changes, and hard stops block submit. |
| Warnings shown but non-blocking | Implemented | `apps/frontend/src/lib/eligibility.ts:97`, `apps/frontend/src/app/api/committee/requestAdd/route.ts:171`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:66` | Warnings persisted and returned; surfaced in UI. |
| Leader selects LTED | Implemented | `apps/frontend/src/app/committees/CommitteeSelector.tsx:531`, `apps/frontend/src/app/committees/CommitteeSelector.tsx:568` | City/LD/ED selection implemented in committee selector. |
| System assigns available seat automatically | Implemented | `apps/frontend/src/app/api/lib/seatUtils.ts:86`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:252`, `docs/SRS/SRS_SCENARIO1_SEAT_ASSIGNMENT_CLARIFICATION_2026-02-23.md` | Clarified requirement: seat assignment is automatic at activation/approval time (not at initial `SUBMITTED`). |
| Submission status set to Submitted | Implemented | `apps/frontend/src/app/api/committee/requestAdd/route.ts:277` | New membership created as `SUBMITTED`. |
| Submission visible to administrators | Implemented | `apps/frontend/src/app/committees/requests/page.tsx:70` | Admin queue reads `SUBMITTED` memberships for active term. |

## Scenario 2: Submission fails eligibility checks

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Hard stops block submission | Implemented | `apps/frontend/src/app/api/committee/requestAdd/route.ts:160` | Returns `422` with `INELIGIBLE` and reasons. |
| Clear error explains failure | Implemented | `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:111`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:217`, `apps/frontend/src/lib/eligibilityMessages.ts:27` | Leader UI renders deterministic hard-stop reasons from eligibility response with centralized message mapping. |
| Leader instructed to contact MCDC staff for exceptions | Implemented | `apps/frontend/src/lib/eligibilityMessages.ts:27`, `apps/frontend/src/__tests__/components/committees/CommitteeRequestForm.preflight.test.tsx:100` | Escalation guidance is explicitly shown for blocked submissions. |
| No record created unless admin submits on behalf | Implemented | `apps/frontend/src/app/api/committee/requestAdd/route.ts:160`, `apps/frontend/src/app/api/committee/requestAdd/route.ts:271` | Ineligible path exits before create; admin path exists via `/api/committee/add`. |

## Scenario 3: Executive Committee confirms vacancy fill

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin creates/selects meeting record | Implemented | `apps/frontend/src/app/api/admin/meetings/route.ts:33`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/submissions/route.ts:30` | Meeting create/list/select implemented. |
| Admin selects submitted candidates approved at meeting | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/submissions/route.ts:42`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:65` | Bulk decisions route processes submitted memberships. |
| Status transitions Submitted -> Confirmed | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:174`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:186`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:340` | Confirmation and activation are recorded as distinct audit events with meeting linkage; persisted state is immediately activated by product design. |
| Confirmation date + meeting reference stored | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:131`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:134` | `confirmedAt` and `meetingRecordId` are set in bulk flow. |
| Member becomes Active | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:130` | Bulk flow sets active membership. |
| Seat marked occupied | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:133` | Seat number assigned on confirmation. |

### Scenario 3 remediation verification

| Finding | Status | Evidence | Impact |
| --- | --- | --- | --- |
| Active admin request UI can bypass meeting workflow | Implemented | `apps/frontend/src/app/committees/requests/RequestCard.tsx:127`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:83` | Request-card path now directs to meetings for confirmation; direct accept is blocked unless `meetingRecordId` is supplied. |
| Bulk meeting confirm does not re-run full eligibility checks | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:90`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:100` | Bulk and direct approval paths both invoke canonical eligibility validation before activation. |

## Scenario 4: Petitioned member wins or loses a primary

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin can mark Won/Lost/Tie outcomes | Implemented | `apps/frontend/src/lib/validations/committee.ts:313`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:107` | Outcome schema and route logic implemented. |
| Only winners are eligible to become ACTIVE members | Implemented | `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:109`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:127` | Winner outcomes map to active status + seat assignment. |
| Tied seats are weighted but vacant | Implemented | `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:103`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:109` | Seat flagged petitioned; tie members get null seat assignment. |
| Lost-primary people retained historically, not added to committee | Implemented | `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:127`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:132` | Membership rows persisted with non-active petition statuses. |
| Reports explain why person is not on committee | Implemented | `apps/report-server/src/committeeMappingHelpers.ts:688`, `apps/report-server/src/committeeMappingHelpers.ts:696`, `docs/SRS/tickets/4.4-scenario4-petition-outcomes-traceability.md` | Candidate-level outcome metadata and report mapping now provide explicit exclusion context (`lost`, `tie`, etc.). |

## Scenario 5: Committee member resigns

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin records date received + method | Implemented | `apps/frontend/src/app/api/committee/remove/route.ts:93`, `apps/frontend/src/app/api/committee/remove/route.ts:108` | Enforced via resignation validation path. |
| Status changes to Resigned | Implemented | `apps/frontend/src/app/api/committee/remove/route.ts:105` | Membership moved to `RESIGNED`. |
| Seat becomes available | Implemented | `apps/frontend/src/lib/eligibility.ts:183`, `apps/frontend/src/app/api/lib/seatUtils.ts:94` | Capacity/occupancy logic only counts `ACTIVE` memberships. |
| Audit log records action and reason | Implemented | `apps/frontend/src/app/api/committee/remove/route.ts:117`, `apps/frontend/src/app/api/committee/remove/route.ts:161`, `apps/frontend/src/lib/auditLog.ts:97` | Resignation/removal paths use fail-closed audit writes via `logAuditEventOrThrow`, including structured reason metadata. |

## Scenario 6: BOE indicates member no longer eligible

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| System flags members affected by BOE updates | Implemented | `packages/shared-prisma/src/boeEligibilityFlagging.ts:222`, `apps/report-server/src/jobOrchestration.ts:18` | Auto follow-up after voter import plus recurring scheduled re-scan are both implemented. |
| Flagging runs on recurring operational cadence without manual API trigger | Implemented | `apps/report-server/src/jobOrchestration.ts:93`, `apps/report-server/src/index.ts:66`, `apps/report-server/.env.example` | Recurring scheduler defaults to 24-hour cadence, configurable through environment variables. |
| Stale pending flags are auto-resolved when condition no longer applies | Implemented | `packages/shared-prisma/src/boeEligibilityFlagging.ts:449`, `packages/shared-prisma/src/boeEligibilityFlagging.ts:508` | Stale `PENDING` rows transition to `RESOLVED_BY_RESCAN` with timestamped resolution metadata. |
| Admin reviews each case | Implemented | `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:121` | Only `PENDING` flags can be reviewed; confirm/dismiss flow enforced. |
| Confirmed review sets Removed + reason | Implemented | `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:188`, `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:193` | Removal reason mapped from flag reason and persisted. |
| BOE review/audit metadata includes decision + actor context | Implemented | `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:159`, `packages/shared-prisma/src/boeEligibilityFlagging.ts:483` | Reviewer flows and system auto-resolution both log `DISCREPANCY_RESOLVED` with flag id/reason/decision and actor context. |
| Removal appears in Changes report | Implemented | `apps/report-server/src/committeeMappingHelpers.ts:531` | Changes dataset includes `Removed` events in date range. |
| Seat freed for future submissions | Implemented | `apps/frontend/src/lib/eligibility.ts:183` | Capacity checks use active-only count. |

## Scenario 7: Leader generates reports for a meeting

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Leader can generate current committee roster | Implemented | `apps/frontend/src/app/committee-roster-reports/page.tsx:1`, `apps/frontend/src/app/committee-roster-reports/CommitteeRosterReportForm.tsx:127`, `apps/frontend/src/components/reports/GenerateReportGrid.tsx:24` | Leader-accessible roster generation path now exists in report workflows. |
| Leader can generate sign-in sheet | Implemented | `apps/frontend/src/app/sign-in-sheet-reports/page.tsx:20`, `apps/frontend/src/app/sign-in-sheet-reports/SignInSheetForm.tsx:163` | Leader report page + generation path are present. |
| Leader can generate designation weight summary | Implemented | `apps/frontend/src/app/weight-summary-reports/page.tsx:20`, `apps/frontend/src/app/weight-summary-reports/WeightSummaryForm.tsx:155` | Leader report page + generation path are present. |
| Reports scoped to leader jurisdiction | Implemented | `apps/frontend/src/app/api/generateReport/route.ts:50`, `apps/frontend/src/app/api/generateReport/route.ts:71`, `apps/frontend/src/app/api/lib/committeeValidation.ts:157` | `ldCommittees` is now admin-only; scoped reports (including `committeeRoster`) are server-side jurisdiction validated. |
| Reports exportable as PDF or CSV | Implemented | `packages/shared-validators/src/schemas/report.ts:128`, `docs/SRS/REPORT_PARAMETER_MATRIX.md:7`, `docs/SRS/tickets/4.7-scenario7-leader-reports-scope-and-roster.md:28` | Requirement wording is aligned to supported formats by report type; leader roster flow is delivered as PDF/XLSX. |

## Cross-Cutting Note: Audit & Defensibility

SRS v0.1 requires defensible, immutable auditability.  
Immutability guard remains in place (`apps/frontend/src/lib/auditLogGuard.ts:12` and wired in `apps/frontend/src/lib/prisma.ts:14`), and compliance-critical membership mutations now use fail-closed audit writes through `logAuditEventOrThrow` (`apps/frontend/src/lib/auditLog.ts:97`, `apps/frontend/src/app/api/committee/remove/route.ts:117`).
