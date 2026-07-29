# Scenario 3 Gaps: Executive Committee Confirmation

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 3)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S3-G1 | A production admin path bypasses meeting-based confirmation workflow. | Direct accept from request card: `apps/frontend/src/app/committees/requests/RequestCard.tsx:46`; direct activation route: `apps/frontend/src/app/api/committee/handleRequest/route.ts:274` | Members can become `ACTIVE` without explicit meeting linkage, reducing procedural defensibility. | Critical |
| S3-G2 | Implementation does not persist `CONFIRMED` status transition in bulk meeting flow. | Schema includes `CONFIRMED`: `apps/frontend/prisma/schema.prisma:27`; bulk decisions writes `ACTIVE`: `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:130` | Diverges from SRS wording and weakens lifecycle traceability consistency. | High |
| S3-G3 | Bulk meeting confirmation does not re-run full eligibility validation at decision time. | Bulk route confirms without `validateEligibility`: `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts:90`; direct accept route does validate: `apps/frontend/src/app/api/committee/handleRequest/route.ts:75` | Hard-stop changes between submission and meeting can be missed. | High |

## Recommended Fixes

1. Make meeting workflow authoritative for approvals:
   - Decommission direct-accept path from `/committees/requests`, or
   - Force `meetingRecordId` + `confirmedAt` on every acceptance path.
2. Standardize lifecycle transitions:
   - Persist `SUBMITTED -> CONFIRMED -> ACTIVE`, or
   - Formally remove `CONFIRMED` status from schema/SRS if product decides it is unnecessary.
3. Re-run eligibility checks in bulk meeting decisions before activation.

## Definition of Done

- No approval path can set `ACTIVE` without meeting linkage when Scenario 3 flow is expected.
- Lifecycle transitions are consistent across all acceptance endpoints.
- Bulk and single approval routes enforce the same eligibility policy.

