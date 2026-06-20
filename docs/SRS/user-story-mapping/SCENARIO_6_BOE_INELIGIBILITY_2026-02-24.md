# Scenario 6 Mapping: BOE File Indicates a Member Is No Longer Eligible

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 6)

Status: `Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| System flags members affected by BOE updates | `packages/shared-prisma/src/boeEligibilityFlagging.ts`, `apps/report-server/src/jobOrchestration.ts` | Implemented | Triggered after voter import and on recurring schedule. |
| Admin reviews each case | `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts`, admin UI under `apps/frontend/src/app/admin/eligibility-flags` | Implemented | Pending flags can be confirmed/dismissed only via review flow. |
| Confirmed review sets Removed + reason | review route above | Implemented | Maps flag reason to structured removal reason; updates membership to `REMOVED`. |
| Removal appears in Changes report | `apps/report-server/src/committeeMappingHelpers.ts` | Implemented | Changes extraction includes `Removed` events with reason details. |
| Seat freed for future submissions | `apps/frontend/src/lib/eligibility.ts`, `apps/frontend/src/app/api/lib/seatUtils.ts` | Implemented | Active-only occupancy logic frees removed members’ seats. |

## Additional operational behavior present

- Stale pending flags auto-resolve on later rescans (`RESOLVED_BY_RESCAN`).
- Auto-resolve and review actions write discrepancy audit records.

## Evidence from tests

- `apps/frontend/src/__tests__/api/admin/eligibilityFlags.test.ts`
- `apps/frontend/src/__tests__/lib/boeEligibilityFlagging.test.ts`
- `apps/report-server/src/__tests__/jobOrchestration.test.ts`
