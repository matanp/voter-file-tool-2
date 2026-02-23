# Scenario 7 Gaps: Leader Generates Reports for a Meeting

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 7)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S7-G1 | Leader-accessible “current committee roster” generation/export path is not clearly implemented. | Committee report page is admin-only: `apps/frontend/src/app/committee-reports/page.tsx:11`; leader can view roster in committee workspace: `apps/frontend/src/app/committees/CommitteeSelector.tsx:735` | Scenario expects leader report generation, not just on-screen view. | Medium |
| S7-G2 | API authorization/scope handling for `ldCommittees` report type is weak for leader-level callers. | Generate route allows `RequestAccess` and above: `apps/frontend/src/app/api/generateReport/route.ts:29`; jurisdiction checks only for scoped report types: `apps/frontend/src/app/api/generateReport/route.ts:56` | Potential over-broad report generation if called directly without UI guardrails. | High |
| S7-G3 | Export format alignment with SRS wording (`PDF or CSV`) is partial; workflow is primarily PDF/XLSX. | Sign-in sheet format fixed to PDF: `packages/shared-validators/src/schemas/report.ts:165`; designation summary PDF/XLSX: `packages/shared-validators/src/schemas/report.ts:174` | Requirements and implementation terminology can diverge during acceptance/signoff. | Low |

## Recommended Fixes

1. Decide product behavior for leader roster generation:
   - Add leader-safe roster export report type, or
   - Update SRS wording to reflect “view roster in app + generate sign-in/weight reports.”
2. Harden `/api/generateReport` authorization:
   - Explicitly restrict `ldCommittees` generation to Admin, or
   - Add leader jurisdiction-scoped variant with server-side enforcement.
3. Align SRS export wording with actual supported formats (or add CSV outputs where required).

## Definition of Done

- Leader reporting capabilities match SRS and are testable.
- Report APIs enforce role/scope constraints independent of UI.
- Export format expectations are unambiguous in docs and implementation.

