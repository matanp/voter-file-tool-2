# SRS Scenario 1 Seat Assignment Clarification

Date: 2026-02-23  
Applies to: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 1)

## Clarification

For Scenario 1, "system assigns an available seat automatically" is implemented as:

- membership is created as `SUBMITTED` at leader/admin submission time
- seat assignment occurs at approval/activation time, not at submission time

## Product Decision

Seat assignment remains an activation-time operation to avoid premature seat reservation and to keep approval workflows consistent with meeting-based confirmation.

## Implementation References

- `apps/frontend/src/app/api/committee/requestAdd/route.ts`
- `apps/frontend/src/app/api/committee/handleRequest/route.ts`
- `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts`
- `apps/frontend/src/app/api/lib/seatUtils.ts`

## Traceability

This clarification closes Ticket 4.1 acceptance criteria for "Seat Assignment Timing Clarification" without modifying the immutable `SRS_v0.1` source file.
