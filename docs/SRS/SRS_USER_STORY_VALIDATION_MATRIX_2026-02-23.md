# SRS v0.1 User Story Validation Matrix

Date: 2026-02-23  
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
| Clear error explains failure | Partially Implemented | `apps/frontend/src/hooks/useApiMutation.ts:85`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:82` | API returns machine-readable reasons, but leader UI typically surfaces generic error text. |
| Leader instructed to contact MCDC staff for exceptions | Not Implemented | `apps/frontend/src/lib/eligibilityMessages.ts:12`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:82` | No explicit “contact MCDC staff” guidance found in failure UX. |
| No record created unless admin submits on behalf | Implemented | `apps/frontend/src/app/api/committee/requestAdd/route.ts:160`, `apps/frontend/src/app/api/committee/requestAdd/route.ts:271` | Ineligible path exits before create; admin path exists via `/api/committee/add`. |

## Scenario 3: Executive Committee confirms vacancy fill

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin creates/selects meeting record | Implemented | `apps/frontend/src/app/api/admin/meetings/route.ts:33`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/submissions/route.ts:30` | Meeting create/list/select implemented. |
| Admin selects submitted candidates approved at meeting | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/submissions/route.ts:42`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:65` | Bulk decisions route processes submitted memberships. |
| Status transitions Submitted -> Confirmed | Implemented with Bugs/Risks | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:126`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:130` | Route comments describe CONFIRMED step, but persisted `status` jumps to `ACTIVE`. |
| Confirmation date + meeting reference stored | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:131`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:134` | `confirmedAt` and `meetingRecordId` are set in bulk flow. |
| Member becomes Active | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:130` | Bulk flow sets active membership. |
| Seat marked occupied | Implemented | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:133` | Seat number assigned on confirmation. |

### Scenario 3 implementation risk (important)

| Finding | Status | Evidence | Impact |
| --- | --- | --- | --- |
| Active admin request UI can bypass meeting workflow | Implemented with Bugs/Risks | `apps/frontend/src/app/committees/requests/RequestCard.tsx:46`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:274` | Accept path sets `ACTIVE` without meeting linkage or `confirmedAt`, conflicting with formal confirmation workflow. |
| Bulk meeting confirm does not re-run full eligibility checks | Implemented with Bugs/Risks | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:90`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:75` | Hard-stop drift between submission time and approval time may go undetected in bulk flow. |

## Scenario 4: Petitioned member wins or loses a primary

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin can mark Won/Lost/Tie outcomes | Implemented | `apps/frontend/src/lib/validations/committee.ts:313`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:107` | Outcome schema and route logic implemented. |
| Only winners are eligible to become ACTIVE members | Implemented | `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:109`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:127` | Winner outcomes map to active status + seat assignment. |
| Tied seats are weighted but vacant | Implemented | `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:103`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:109` | Seat flagged petitioned; tie members get null seat assignment. |
| Lost-primary people retained historically, not added to committee | Implemented | `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:127`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:132` | Membership rows persisted with non-active petition statuses. |
| Reports explain why person is not on committee | Partially Implemented | `apps/report-server/src/committeeMappingHelpers.ts:688`, `apps/report-server/src/committeeMappingHelpers.ts:696` | Petition outcomes report includes outcome labels/votes; broader explanatory UX consistency not fully validated. |

## Scenario 5: Committee member resigns

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin records date received + method | Implemented | `apps/frontend/src/app/api/committee/remove/route.ts:93`, `apps/frontend/src/app/api/committee/remove/route.ts:108` | Enforced via resignation validation path. |
| Status changes to Resigned | Implemented | `apps/frontend/src/app/api/committee/remove/route.ts:105` | Membership moved to `RESIGNED`. |
| Seat becomes available | Implemented | `apps/frontend/src/lib/eligibility.ts:183`, `apps/frontend/src/app/api/lib/seatUtils.ts:94` | Capacity/occupancy logic only counts `ACTIVE` memberships. |
| Audit log records action and reason | Partially Implemented | `apps/frontend/src/app/api/committee/remove/route.ts:115`, `apps/frontend/src/lib/auditLog.ts:22` | Action is logged, but audit writes are best-effort (not guaranteed on failure). |

## Scenario 6: BOE indicates member no longer eligible

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| System flags members affected by BOE updates | Implemented | `packages/shared-prisma/src/boeEligibilityFlagging.ts:192`, `apps/report-server/src/jobOrchestration.ts:17` | Auto follow-up after voter import plus manual trigger route exists. |
| Admin reviews each case | Implemented | `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:121` | Only `PENDING` flags can be reviewed; confirm/dismiss flow enforced. |
| Confirmed review sets Removed + reason | Implemented | `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:184`, `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:189` | Removal reason mapped from flag reason and persisted. |
| Removal appears in Changes report | Implemented | `apps/report-server/src/committeeMappingHelpers.ts:531` | Changes dataset includes `Removed` events in date range. |
| Seat freed for future submissions | Implemented | `apps/frontend/src/lib/eligibility.ts:183` | Capacity checks use active-only count. |

## Scenario 7: Leader generates reports for a meeting

| Acceptance criterion | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Leader can generate current committee roster | Partially Implemented | `apps/frontend/src/app/committee-reports/page.tsx:11`, `apps/frontend/src/app/committees/CommitteeSelector.tsx:735` | Leaders can view roster in Committees workspace, but leader-accessible roster export/generation path is not clearly implemented. |
| Leader can generate sign-in sheet | Implemented | `apps/frontend/src/app/sign-in-sheet-reports/page.tsx:20`, `apps/frontend/src/app/sign-in-sheet-reports/SignInSheetForm.tsx:163` | Leader report page + generation path are present. |
| Leader can generate designation weight summary | Implemented | `apps/frontend/src/app/weight-summary-reports/page.tsx:20`, `apps/frontend/src/app/weight-summary-reports/WeightSummaryForm.tsx:155` | Leader report page + generation path are present. |
| Reports scoped to leader jurisdiction | Implemented with Bugs/Risks | `apps/frontend/src/app/api/generateReport/route.ts:56`, `apps/frontend/src/app/api/lib/committeeValidation.ts:157` | Scope enforcement exists for scoped report types, but `ldCommittees` is not scope-validated in API. |
| Reports exportable as PDF or CSV | Partially Implemented | `packages/shared-validators/src/schemas/report.ts:165`, `packages/shared-validators/src/schemas/report.ts:174` | Sign-in sheet is PDF-only; Excel (`xlsx`) exists for some reports. CSV-specific output is not primary. |

## Cross-Cutting Note: Audit & Defensibility

SRS v0.1 requires defensible, immutable auditability.  
Immutability guard is implemented (`apps/frontend/src/lib/auditLogGuard.ts:12` and wired in `apps/frontend/src/lib/prisma.ts:14`), but write operations can still proceed when log writes fail (`apps/frontend/src/lib/auditLog.ts:45`), which is a compliance/traceability risk.
