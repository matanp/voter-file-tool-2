# Scenario 5 Mapping: Committee Member Resigns

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 5)

Status: `Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| Admin records date received + method | `apps/frontend/src/lib/validations/committee.ts`, `apps/frontend/src/app/api/committee/remove/route.ts`, `apps/frontend/src/app/committees/CommitteeSelector.tsx` | Implemented | `resignationDateReceived` and `resignationMethod` are required for `RESIGN`. |
| Status changes to Resigned | `apps/frontend/src/app/api/committee/remove/route.ts` | Implemented | Active membership transitions to `RESIGNED`. |
| Seat becomes available | `apps/frontend/src/lib/eligibility.ts`, `apps/frontend/src/app/api/lib/seatUtils.ts` | Implemented | Capacity and seat assignment count only `ACTIVE` memberships. |
| Audit log records action and reason | `apps/frontend/src/app/api/committee/remove/route.ts`, `apps/frontend/src/lib/auditLog.ts` | Implemented | Uses `logAuditEventOrThrow` fail-closed for resignation/removal paths. |

## Evidence from tests

- `apps/frontend/src/__tests__/api/committee/remove.test.ts`
- `apps/report-server/src/__tests__/committeeMappingHelpers.test.ts` (changes report mapping)
