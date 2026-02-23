# Scenario 1 Gaps: Leader Submits New Committee Member

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 1)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S1-G1 | Add-flow UI does not clearly present all required voter details (especially Home ED + AD) at the decision point. | `apps/frontend/src/app/committees/AddCommitteeForm.tsx:242` (results table rendered with no explicit columns), `apps/frontend/src/app/recordsearch/VoterRecordTable.tsx:245`, `apps/frontend/src/app/recordsearch/RecordsList.tsx:325` | Leaders may submit without seeing the exact required location/eligibility context described by SRS acceptance criteria. | Medium |
| S1-G2 | “Live checks” are primarily submit-time checks; no wired preflight validation UX for add/request forms. | Preflight route exists: `apps/frontend/src/app/api/committee/eligibility/route.ts:3`; add/request forms submit directly: `apps/frontend/src/app/committees/AddCommitteeForm.tsx:122`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx:92` | UX does not fully match “live eligibility checks before submission” expectation; users discover issues later in flow. | Medium |
| S1-G3 | Seat assignment occurs at activation/approval rather than when status is set to `SUBMITTED`. | Submitted membership created without seat: `apps/frontend/src/app/api/committee/requestAdd/route.ts:271`; seat assignment occurs on activation: `apps/frontend/src/app/api/lib/seatUtils.ts:86`, `apps/frontend/src/app/api/committee/handleRequest/route.ts:252` | If interpreted strictly, implementation diverges from acceptance criterion wording (“assigns seat automatically” at submission step). | Low |

## Recommended Fixes

1. Add a structured “Eligibility Snapshot” panel in add/request forms with: voter identity, Home ED, AD, LTED, capacity state, and warnings.
2. Wire add/request UI to call `/api/committee/eligibility` on candidate selection and on LTED selection change.
3. Clarify product rule for seat assignment timing:
   - If intended at submission: reserve seat at `SUBMITTED` with conflict handling.
   - If intended at approval: update SRS wording to explicitly reflect that.

## Definition of Done

- Leaders can view Home ED + AD + LTED + capacity in the add/request UI before clicking submit.
- Preflight endpoint is called in UI and displays hard stops/warnings before submit.
- Seat assignment timing is either implemented per SRS wording or formally revised in requirements.

