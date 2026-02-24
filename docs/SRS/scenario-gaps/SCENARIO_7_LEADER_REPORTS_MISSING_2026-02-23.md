# Scenario 7 Gaps: Leader Generates Reports for a Meeting

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 7)

## Resolution Status

Status: `Resolved` via Ticket 4.7 (`docs/SRS/tickets/4.7-scenario7-leader-reports-scope-and-roster.md`).

## Previously Missing Items (Now Addressed)

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S7-G1 | Leader-accessible “current committee roster” generation/export path is not clearly implemented. | New leader-accessible page: `apps/frontend/src/app/committee-roster-reports/page.tsx`; report form: `apps/frontend/src/app/committee-roster-reports/CommitteeRosterReportForm.tsx`; workflow entry from reports grid: `apps/frontend/src/components/reports/GenerateReportGrid.tsx` | Leader workflow now supports direct roster generation. | Closed |
| S7-G2 | API authorization/scope handling for `ldCommittees` report type is weak for leader-level callers. | `ldCommittees` admin-only guard: `apps/frontend/src/app/api/generateReport/route.ts`; scoped leader variant: `committeeRoster` in `packages/shared-validators/src/schemas/report.ts`; server-side scope enforcement remains in `validateReportJurisdictionAccess` | Direct leader calls cannot generate countywide output. | Closed |
| S7-G3 | Export format alignment with SRS wording (`PDF or CSV`) is partial; workflow is primarily PDF/XLSX. | Format support documented in `docs/SRS/REPORT_PARAMETER_MATRIX.md`; `committeeRoster` supports PDF/XLSX (`packages/shared-validators/src/schemas/report.ts`) | Format expectations are now explicitly documented as PDF/XLSX by report type. | Closed |
