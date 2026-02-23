# SRS Formal Requirements Assessment (Current-State)

Date: 2026-02-23  
Scope baseline:
- `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`
- `docs/SRS/SRS_ADDITIONAL_REQUIREMENTS_Governance_Config.md`

## 1. What This Assessment Covers

This document assesses current implementation status against the two formal requirements documents above, with focus on:
- SRS v0.1 user stories (Scenarios 1-7)
- Core governance and validation rules
- Additional governance configurability requirements

Status labels used:
- `Implemented`
- `Partially Implemented`
- `Implemented with Bugs/Risks`
- `Not Implemented`

## 2. Summary

### Overall by user story

| SRS Scenario | Status | Notes |
| --- | --- | --- |
| Scenario 1 (Leader submits new member) | Implemented | Preflight snapshot/live checks are wired in UI; seat-assignment timing is formally clarified in addendum. |
| Scenario 2 (Submission fails eligibility) | Partially Implemented | Backend blocks correctly; leader-facing error guidance is weak and missing “contact MCDC staff” instruction. |
| Scenario 3 (Executive Committee confirmation) | Implemented with Bugs/Risks | Meeting workflow exists, but active UI flow bypasses meeting linkage and CONFIRMED transition. |
| Scenario 4 (Petition outcomes) | Implemented with Bugs/Risks | Core behavior works; status-model divergence and edge-case consistency risks remain. |
| Scenario 5 (Resignation workflow) | Implemented with Bugs/Risks | Required fields/status transitions implemented; audit reliability risk applies. |
| Scenario 6 (BOE-driven removals) | Implemented | Automated flagging after voter import + admin review/removal flow are implemented. |
| Scenario 7 (Leader reports) | Partially Implemented | Sign-in + weight summary implemented; leader “generate current roster” is not clearly implemented as a leader export path. |

### Additional Governance Config requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| Single `CommitteeGovernanceConfig` row | Implemented | Enforced by singleton unique index migration. |
| Configurable party rule (`requiredPartyCode`) | Partially Implemented | Rule is enforced in code; app-layer validation against `DropdownLists.party` not found. |
| Configurable max seats (`maxSeatsPerLted`) | Implemented | Used in capacity checks, seat creation, and seat-weight computation. |
| Configurable AD check (`requireAssemblyDistrictMatch`) | Implemented | Hard-stop and BOE flagging behavior honor toggle. |
| Operational configurability (admin-managed in app) | Not Implemented | No governance-config CRUD/admin UI path found for these fields. |

## 3. Highest-Risk Findings

1. Meeting approval paths are inconsistent with SRS Executive Committee workflow.  
Evidence:
- `/committees/requests` uses direct accept/reject against `/api/committee/handleRequest` (`apps/frontend/src/app/committees/requests/RequestCard.tsx:46`, `apps/frontend/src/app/committees/requests/page.tsx:103`).
- That path activates members without meeting linkage (`apps/frontend/src/app/api/committee/handleRequest/route.ts:274`).
- Meeting flow exists separately (`apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:127`).
Impact:
- Scenario 3 traceability (meeting reference + formal confirmation flow) is bypassable.

2. Bulk meeting decisions do not re-run full eligibility validation at approval time.  
Evidence:
- Bulk confirm assigns seat and activates, but does not call `validateEligibility` (`apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:90`).
- Direct admin accept route *does* validate (`apps/frontend/src/app/api/committee/handleRequest/route.ts:75`).
Impact:
- SRS hard stops can be bypassed during bulk approval if conditions changed post-submission.

3. Audit logging is best-effort, not guaranteed.  
Evidence:
- `logAuditEvent` catches and suppresses errors (`apps/frontend/src/lib/auditLog.ts:22`).
Impact:
- Conflicts with SRS requirement for an immutable/full audit trail (`SRS v0.1 §11.1`).

4. Leader roster “generation” is not clearly available as a leader-scoped export workflow.  
Evidence:
- Committee report page is admin-only (`apps/frontend/src/app/committee-reports/page.tsx:11`).
- Leaders can generate sign-in and weight-summary reports (`apps/frontend/src/app/sign-in-sheet-reports/page.tsx:20`, `apps/frontend/src/app/weight-summary-reports/page.tsx:20`).
Impact:
- Scenario 7 acceptance criteria only partially satisfied as written.

## 4. Additional Requirements Assessment (Detailed)

### 4.1 CommitteeGovernanceConfig singleton

Status: `Implemented`

Evidence:
- Model fields in schema (`apps/frontend/prisma/schema.prisma:579`).
- Singleton enforcement migration (`apps/frontend/prisma/migrations/20260218213513_committee_governance_config_singleton/migration.sql:14`).
- Seeded default row (`apps/frontend/prisma/seed.ts:27`).

### 4.2 Party Affiliation (`requiredPartyCode`)

Status: `Partially Implemented`

Implemented:
- Eligibility hard-stop compares voter party vs config (`apps/frontend/src/lib/eligibility.ts:141`).
- BOE flagging uses same config-driven logic (`packages/shared-prisma/src/boeEligibilityFlagging.ts:136`).

Gap:
- No application-layer validation that configured party code is from `DropdownLists.party` (requirement 2.1).

### 4.3 Max Seats per LTED (`maxSeatsPerLted`)

Status: `Implemented`

Evidence:
- Capacity checks in membership routes (`apps/frontend/src/app/api/committee/add/route.ts:190`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:191`).
- Seat creation uses max seats (`apps/frontend/src/app/api/lib/seatUtils.ts:47`).
- Seat weight recompute uses max seats (`apps/frontend/src/app/api/lib/seatUtils.ts:135`).
- UI capacity behavior consumes `maxSeatsPerLted` (`apps/frontend/src/app/committees/AddCommitteeForm.tsx:41`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:30`).

### 4.4 Assembly District toggle (`requireAssemblyDistrictMatch`)

Status: `Implemented`

Evidence:
- Hard-stop enforced conditionally (`apps/frontend/src/lib/eligibility.ts:148`).
- BOE flagging AD mismatch conditioned on flag (`packages/shared-prisma/src/boeEligibilityFlagging.ts:147`).

### 4.5 Configurability operations

Status: `Not Implemented`

Finding:
- No admin route/UI found to update `requiredPartyCode`, `maxSeatsPerLted`, `requireAssemblyDistrictMatch`, `nonOverridableIneligibilityReasons` in-app.

## 5. Recommended Remediation Order

1. Unify approval flow: require meeting-linked confirmation path (or enforce meeting metadata in `handleRequest`) and remove bypass.
2. Add eligibility re-validation (same checks as `validateEligibility`) to bulk meeting decision confirmation.
3. Make audit writes fail-safe for compliance-critical operations (or transactional hard-fail with explicit fallback policy).
4. Close Scenario 7 gap for leader roster generation (or formally revise SRS acceptance text if product intent changed).
5. Add governance-config management endpoint/UI and party-code validation against `DropdownLists.party`.

## 6. Companion Document

Detailed per-acceptance-criteria matrix:
- `docs/SRS/SRS_USER_STORY_VALIDATION_MATRIX_2026-02-23.md`
