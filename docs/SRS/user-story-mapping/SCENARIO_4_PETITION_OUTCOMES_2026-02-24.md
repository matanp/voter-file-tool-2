# Scenario 4 Mapping: Petitioned Member Wins or Loses a Primary

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 4)

Status: `Partially Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| Admin can mark Won/Lost/Tie outcomes | `apps/frontend/src/lib/validations/committee.ts`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` | Implemented | Supports `WON_PRIMARY`, `LOST_PRIMARY`, `TIE`, `UNOPPOSED`. |
| Only winners become Active committee members | petition outcome route above | Implemented | Winner outcomes map to `ACTIVE`; losers/ties are non-active statuses. |
| Tied seats are weighted but vacant | petition outcome route + designation-weight logic (`apps/frontend/src/lib/designationWeight.ts`) | Implemented | Seat is marked petitioned; tie candidates do not receive seat assignment. |
| Lost-primary individuals retained in history and not added to committee | petition outcome route above | Implemented | Rows are retained as `PETITIONED_LOST` / `PETITIONED_TIE`. |
| Reports explain why person is not on committee | `apps/report-server/src/committeeMappingHelpers.ts` | Implemented | Petition outcomes and changes reporting include loss/tie context. |

## Gaps / risks

1. The base SRS narrative “top four vote-getters become eligible” is still procedural/manual; the system validates outcome shape but does not auto-rank candidates by vote count.
2. “Won primary” is represented via `ACTIVE + membershipType=PETITIONED` (not a separate persisted status label).

## Evidence from tests

- `apps/frontend/src/__tests__/api/admin/petition-outcomes/record.test.ts`
- `apps/report-server/src/__tests__/committeeMappingHelpers.test.ts`
