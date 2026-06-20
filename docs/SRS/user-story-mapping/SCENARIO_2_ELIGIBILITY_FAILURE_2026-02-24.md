# Scenario 2 Mapping: Submission Fails Eligibility Checks

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 2)

Status: `Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| Hard stops block submission | `apps/frontend/src/lib/eligibility.ts`, `apps/frontend/src/app/api/committee/requestAdd/route.ts` | Implemented | Ineligible requests return `422` with `INELIGIBLE` reason codes. |
| Clear failure message displayed | `apps/frontend/src/lib/eligibilityMessages.ts`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx` | Implemented | Deterministic reason mapping for UI copy. |
| Leader instructed to contact staff for exceptions | `apps/frontend/src/lib/eligibilityMessages.ts`, `apps/frontend/src/app/committees/EligibilitySnapshotPanel.tsx` | Implemented | Escalation guidance appears on blocked state. |
| No record created unless admin submits on behalf | `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/add/route.ts` | Implemented | Leader request path exits before create on hard stops; admin path is separate/admin-only. |

## Evidence from tests

- `apps/frontend/src/__tests__/components/committees/CommitteeRequestForm.preflight.test.tsx`
- `apps/frontend/src/__tests__/api/committee/requestAdd.test.ts`
- `apps/frontend/src/__tests__/lib/eligibility.test.ts`
