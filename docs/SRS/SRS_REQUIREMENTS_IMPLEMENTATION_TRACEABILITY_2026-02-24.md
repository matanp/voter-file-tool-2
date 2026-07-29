# SRS Requirements Traceability Investigation

> **Branch overview:** [FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md](FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md) is the single-page summary. Scenario status here is superseded by [SRS_FORMAL_REQUIREMENTS_ASSESSMENT_2026-02-23.md](SRS_FORMAL_REQUIREMENTS_ASSESSMENT_2026-02-23.md); this doc remains useful for the non-blocking gap list and area-by-area mapping.

Date: 2026-02-24  
Author: Codex investigation run

## Scope and source of truth

This investigation maps current implementation to these two requirement documents only:

1. `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`
2. `docs/SRS/SRS_ADDITIONAL_REQUIREMENTS_Governance_Config.md`

## Method

- Reviewed backend routes, validation, schema, report server, and UI flows.
- Reviewed test coverage in `apps/frontend/src/__tests__` and `apps/report-server/src/__tests__`.
- Assessed each requirement area as:
  - `Implemented`
  - `Partially Implemented`
  - `Not Implemented`

## Executive summary

| Area | Status | Notes |
| --- | --- | --- |
| Roles, access control, jurisdiction scoping | Implemented | Route-level privilege checks + jurisdiction filters are broadly enforced. |
| Committee term model (single active term) | Implemented | Active-term lookups are used across membership/report flows. |
| Membership lifecycle and workflows | Partially Implemented | Core flows exist; `CONFIRMED` is represented by audit semantics, not persisted status. |
| Hard-stop validation + warnings | Implemented | Server-side canonical checks are in place and preflight UX is wired. |
| Weight and seat logic | Implemented | Configurable seat count and seat-weight recomputation are implemented. |
| Governance config (additional requirements) | Implemented | Singleton config, admin UI/API, and downstream runtime effect are implemented. |
| Reporting (leader/admin) | Partially Implemented | Required report families exist; Scenario 7 wording expects CSV while implementation is mostly PDF/XLSX. |
| Audit and defensibility | Partially Implemented | Immutability exists; some mutation endpoints still use fail-open audit writes. |
| Data source ingestion formats | Partially Implemented | CSV ingestion is implemented; direct Access DB ingestion is not implemented in-app. |

## Requirements mapping

### 1. Users and access (SRS §3, §11.2)

Status: `Implemented`

- Privilege enforcement wrapper: `apps/frontend/src/app/api/lib/withPrivilege.ts`
- Privilege ordering: `apps/frontend/src/lib/utils.ts`
- Leader jurisdiction assignment/removal APIs: `apps/frontend/src/app/api/admin/jurisdictions/route.ts`, `apps/frontend/src/app/api/admin/jurisdictions/[id]/route.ts`
- Leader jurisdiction scoping on committee/report routes: `apps/frontend/src/app/api/lib/committeeValidation.ts`, `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/fetchCommitteeList/route.ts`

### 2. Committee terms (SRS §5)

Status: `Implemented`

- Term model + active flag: `apps/frontend/prisma/schema.prisma`
- Active term lookup in shared validation path: `apps/frontend/src/app/api/lib/committeeValidation.ts`
- Admin term management: `apps/frontend/src/app/api/admin/terms/route.ts`, `apps/frontend/src/app/api/admin/terms/[id]/route.ts`, `apps/frontend/src/app/admin/terms/TermsManagement.tsx`

### 3. Membership lifecycle (SRS §6)

Status: `Partially Implemented`

Implemented:
- Membership model + status enums: `apps/frontend/prisma/schema.prisma`
- Submit/add/approve/reject/remove/resign routes:
  - `apps/frontend/src/app/api/committee/requestAdd/route.ts`
  - `apps/frontend/src/app/api/committee/add/route.ts`
  - `apps/frontend/src/app/api/committee/handleRequest/route.ts`
  - `apps/frontend/src/app/api/committee/remove/route.ts`
- Petition outcomes route: `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`

Gap:
- `CONFIRMED` is not persisted as a stable membership state in DB transitions (the row is written as `ACTIVE` while confirmed/activated are captured via timestamps/audit snapshots).
  - Evidence: `apps/frontend/src/app/api/committee/handleRequest/route.ts`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts`

### 4. Validation rules (SRS §7)

Status: `Implemented`

- Canonical hard-stop + warning engine: `apps/frontend/src/lib/eligibility.ts`
- Preflight endpoint: `apps/frontend/src/app/api/committee/eligibility/route.ts`
- Leader/admin UI integration:
  - `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`
  - `apps/frontend/src/app/committees/AddCommitteeForm.tsx`
  - `apps/frontend/src/app/committees/EligibilitySnapshotPanel.tsx`
- Message mapping and escalation guidance: `apps/frontend/src/lib/eligibilityMessages.ts`

### 5. Weight and seat logic (SRS §8)

Status: `Implemented`

- Seat model + weights: `apps/frontend/prisma/schema.prisma`
- Seat creation/assignment/recompute helpers: `apps/frontend/src/app/api/lib/seatUtils.ts`
- LTED weight update transaction: `apps/frontend/src/app/api/committee/updateLtedWeight/route.ts`
- Designation contribution rules: `apps/frontend/src/lib/designationWeight.ts`

### 6. Workflow coverage (SRS §9)

Status: `Partially Implemented`

Implemented:
- Leader submission flow with preflight and server-side authoritative enforcement.
- Meeting-based admin confirmation flow with eligibility re-check.

Gap:
- Admin override capability (`forceAdd`/`overrideReason`) is implemented at API level but not exposed in current UI forms.
  - API support evidence: `apps/frontend/src/app/api/committee/add/route.ts`, `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/handleRequest/route.ts`
  - UI payloads do not include override fields: `apps/frontend/src/app/committees/AddCommitteeForm.tsx`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`

### 7. Reporting outputs (SRS §10)

Status: `Partially Implemented`

Implemented:
- Leader report pages + admin/leader scope handling:
  - `apps/frontend/src/app/committee-roster-reports/CommitteeRosterReportForm.tsx`
  - `apps/frontend/src/app/sign-in-sheet-reports/SignInSheetForm.tsx`
  - `apps/frontend/src/app/weight-summary-reports/WeightSummaryForm.tsx`
  - `apps/frontend/src/app/api/generateReport/route.ts`
- Report generation pipeline and mappings: `apps/report-server/src/index.ts`, `apps/report-server/src/committeeMappingHelpers.ts`

Gap:
- Scenario 7 acceptance language says “PDF or CSV”; implementation standard is mostly “PDF or XLSX” for these report types.
  - Evidence: `packages/shared-validators/src/schemas/report.ts`, `docs/SRS/REPORT_PARAMETER_MATRIX.md`

### 8. Audit and security (SRS §11)

Status: `Partially Implemented`

Implemented:
- Immutable audit guard at Prisma middleware layer: `apps/frontend/src/lib/auditLogGuard.ts`, `apps/frontend/src/lib/prisma.ts`
- Admin audit list/detail/export APIs: `apps/frontend/src/app/api/admin/audit/route.ts`, `apps/frontend/src/app/api/admin/audit/export/route.ts`

Gap:
- Some membership-changing flows still rely on fail-open audit writes (`logAuditEvent`), so mutation can succeed if audit insert fails.
  - Fail-open helper behavior: `apps/frontend/src/lib/auditLog.ts`
  - Examples: `apps/frontend/src/app/api/committee/add/route.ts`, `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/handleRequest/route.ts`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts`

### 9. Data sources (SRS §4)

Status: `Partially Implemented`

Implemented:
- Authoritative voter import pipeline from file uploads and recurring BOE re-scan orchestration.
  - `apps/report-server/src/reportProcessors/voterImportProcessor.ts`
  - `packages/voter-import-processor/src/parseVoterFile.ts`
  - `apps/report-server/src/jobOrchestration.ts`

Gap:
- Ingestion supports CSV parser flow; direct Access DB ingestion is not implemented in-app.
  - Evidence: CSV parser dependency and stream parser path only in `packages/voter-import-processor/src/parseVoterFile.ts`

## Additional requirements mapping (Governance Config)

| Additional requirement | Status | Evidence |
| --- | --- | --- |
| Singleton `CommitteeGovernanceConfig` row | Implemented | Schema + singleton index migration + seed (`apps/frontend/prisma/schema.prisma`, `apps/frontend/prisma/migrations/20260218213513_committee_governance_config_singleton/migration.sql`, `apps/frontend/prisma/seed.ts`) |
| Configurable `requiredPartyCode` | Implemented | Eligibility + BOE flagging + admin validation against dropdown values (`apps/frontend/src/lib/eligibility.ts`, `packages/shared-prisma/src/boeEligibilityFlagging.ts`, `apps/frontend/src/app/api/admin/governance-config/route.ts`) |
| Configurable `maxSeatsPerLted` | Implemented | Capacity + seat creation + seat weight + UI usage (`apps/frontend/src/lib/eligibility.ts`, `apps/frontend/src/app/api/lib/seatUtils.ts`, `apps/frontend/src/app/committees/CommitteeSelector.tsx`) |
| Configurable `requireAssemblyDistrictMatch` | Implemented | Eligibility hard-stop and BOE flagging respect toggle (`apps/frontend/src/lib/eligibility.ts`, `packages/shared-prisma/src/boeEligibilityFlagging.ts`) |
| Admin-operational configurability in app | Implemented | Admin page/API/tests (`apps/frontend/src/app/admin/governance-config/GovernanceConfigClient.tsx`, `apps/frontend/src/app/api/admin/governance-config/route.ts`, `apps/frontend/src/__tests__/api/admin/governance-config.integration.test.ts`) |

## High-priority gaps to address

1. Expose admin override controls in UI (`forceAdd`, `overrideReason`) with explicit audit context.
2. Normalize audit durability policy for all membership state mutations (prefer fail-closed for compliance-critical transitions).
3. Resolve report format contract drift (Scenario 7 CSV wording vs PDF/XLSX implementation).
4. Decide whether Access DB import must be natively supported or formally documented as out of scope in favor of CSV exports.
5. Decide whether `CONFIRMED` must be a persisted intermediate status or remain an audit/timestamp semantic.

## User story documents

Per-scenario mapping docs are in:

- `docs/SRS/user-story-mapping/SCENARIO_1_LEADER_SUBMISSION_2026-02-24.md`
- `docs/SRS/user-story-mapping/SCENARIO_2_ELIGIBILITY_FAILURE_2026-02-24.md`
- `docs/SRS/user-story-mapping/SCENARIO_3_EXEC_CONFIRMATION_2026-02-24.md`
- `docs/SRS/user-story-mapping/SCENARIO_4_PETITION_OUTCOMES_2026-02-24.md`
- `docs/SRS/user-story-mapping/SCENARIO_5_RESIGNATION_2026-02-24.md`
- `docs/SRS/user-story-mapping/SCENARIO_6_BOE_INELIGIBILITY_2026-02-24.md`
- `docs/SRS/user-story-mapping/SCENARIO_7_LEADER_REPORTS_2026-02-24.md`
