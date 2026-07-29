# Scenario 7 Mapping: Leader Generates Reports for a Meeting

Date: 2026-02-24

Source requirement: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 7)

Status: `Partially Implemented`

## Acceptance criteria mapping

| Acceptance criterion | Implementation mapping | Status | Notes |
| --- | --- | --- | --- |
| Leader can generate current committee roster | `apps/frontend/src/app/committee-roster-reports/CommitteeRosterReportForm.tsx`, `apps/frontend/src/app/api/generateReport/route.ts` | Implemented | Leader-facing roster flow is present. |
| Leader can generate sign-in sheet | `apps/frontend/src/app/sign-in-sheet-reports/SignInSheetForm.tsx` | Implemented | PDF generation flow is present and tested. |
| Leader can generate designation weight summary | `apps/frontend/src/app/weight-summary-reports/WeightSummaryForm.tsx` | Implemented | Report flow exists with jurisdiction/countywide handling by role. |
| Reports scoped to leader jurisdiction | `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/lib/committeeValidation.ts` | Implemented | Server-side authorization checks enforce scope. |
| Reports exportable as PDF or CSV | `packages/shared-validators/src/schemas/report.ts`, forms above | Partially Implemented | Implemented output contract is mostly PDF/XLSX (not CSV) for these report types. |

## Gap

- Requirement wording uses “PDF or CSV”; code and UI standardize on “PDF or XLSX” for committee roster and designation weight summary.

## Evidence from tests

- `apps/frontend/src/__tests__/api/generateReport.test.ts`
- `apps/frontend/src/__tests__/app/committee-roster-reports/CommitteeRosterReportForm.test.tsx`
- `apps/frontend/src/app/sign-in-sheet-reports/__tests__/SignInSheetForm.test.tsx`
