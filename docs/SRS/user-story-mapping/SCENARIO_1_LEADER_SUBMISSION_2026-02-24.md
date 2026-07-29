# Scenario 1 Mapping: Leader Submits a New Committee Member

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 1)

Status: `Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| Leader can search by VRN or name | `apps/frontend/src/app/components/RecordSearchForm.tsx` | Implemented | Supports `VRCNUM`, `firstName`, `lastName`. |
| System displays voter details (name, address, Home ED, AD) | `apps/frontend/src/app/committees/EligibilitySnapshotPanel.tsx`, `apps/frontend/src/app/api/committee/eligibility/route.ts` | Implemented | Snapshot includes voter, Home ED, AD, party, LTED, capacity. |
| System performs live checks (registered, party, AD, capacity) | `apps/frontend/src/lib/eligibility.ts`, `apps/frontend/src/app/api/committee/eligibility/route.ts` | Implemented | Canonical checks live on server; preflight is read-only UX. |
| Warnings shown but non-blocking | `apps/frontend/src/lib/eligibility.ts`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx` | Implemented | Warnings returned and displayed; hard stops block. |
| Leader selects LTED | `apps/frontend/src/app/committees/CommitteeSelector.tsx` | Implemented | City/LD/ED selection exists and is jurisdiction-filtered for leaders. |
| System assigns available seat automatically | `apps/frontend/src/app/api/lib/seatUtils.ts`, `apps/frontend/src/app/api/committee/handleRequest/route.ts` | Implemented | Seat assignment happens automatically at activation/approval time. |
| Submission status set to Submitted | `apps/frontend/src/app/api/committee/requestAdd/route.ts` | Implemented | New or re-submitted requests are stored as `SUBMITTED`. |
| Submission visible to administrators | `apps/frontend/src/app/committees/requests/page.tsx` | Implemented | Admin queue reads active-term `SUBMITTED` memberships. |

## Evidence from tests

- `apps/frontend/src/__tests__/api/committee/requestAdd.test.ts`
- `apps/frontend/src/__tests__/components/committees/CommitteeRequestForm.preflight.test.tsx`
- `apps/frontend/src/__tests__/api/committee/eligibility.test.ts`
