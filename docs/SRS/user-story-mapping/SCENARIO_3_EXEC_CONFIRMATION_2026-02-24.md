# Scenario 3 Mapping: Executive Committee Confirms a Vacancy Fill

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 3)

Status: `Partially Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| Admin creates/selects meeting record | `apps/frontend/src/app/api/admin/meetings/route.ts`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/submissions/route.ts` | Implemented | Meeting CRUD + submission listing are implemented. |
| Admin selects submitted candidates approved at that meeting | `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts` | Implemented | Bulk confirm/reject decisions are meeting-scoped. |
| Status transitions Submitted -> Confirmed | `apps/frontend/src/app/api/committee/handleRequest/route.ts`, `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts` | Partially Implemented | Audit/timestamps capture confirmation, but persisted `status` is written directly to `ACTIVE`. |
| Confirmation date and meeting reference stored | same as above | Implemented | `confirmedAt` and `meetingRecordId` are persisted. |
| Member becomes Active | same as above | Implemented | Membership is activated in approval flow. |
| Seat marked occupied | `apps/frontend/src/app/api/lib/seatUtils.ts`, approval routes above | Implemented | Seat assignment is atomic with capacity checks. |

## Key hardening present

- Approval path requires valid `meetingRecordId` when accepting.
- Eligibility is re-validated at decision time before activation.

Evidence:
- `apps/frontend/src/__tests__/api/admin/meetings/meetings.test.ts`
- `apps/frontend/src/__tests__/api/committee/handleRequest.test.ts`

## Gap

- If strict persistence of `CONFIRMED` status is required (not just timestamp/audit semantics), the current implementation does not keep a durable intermediate `CONFIRMED` state.
