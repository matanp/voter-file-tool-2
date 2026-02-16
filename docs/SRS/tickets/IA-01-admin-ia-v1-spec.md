# IA-01 Admin IA v1 Spec

**Status:** Open
**Roadmap:** [SRS_UI_PLANNING_GAPS.md](../SRS_UI_PLANNING_GAPS.md) §16
**Effort:** 0.5 day
**Depends on:** None

## Summary

Create a simple IA diagram for v1 that defines where new admin features (meetings, terms, jurisdictions, eligibility flags, audit) will live, how `/admin` navigation will be structured, and clarifies the fate of the requests page post-migration.

## Acceptance Criteria

- [ ] IA diagram covering: admin sections, committees sections, reports
- [ ] Define placement of new admin pages: meetings, terms, jurisdictions, eligibility flags, audit
- [ ] Clarify: Will `/admin` get sidebar or tab navigation? Nested routes?
- [ ] Clarify: Committees flow — does `/committees/requests` remain? Merge? Redirect? What happens when requests become SUBMITTED memberships?
- [ ] Clarify: Report pages — where do new report types (SignInSheet, DesignationWeightSummary, VacancyReport, etc.) go?

## Implementation Notes

- **Extend:** [UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md](../../UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md) with v1 planned routes
- **Output:** Add a "v1 Planned IA" section or new diagram to 02_INFORMATION_ARCHITECTURE.md, or create a companion doc in docs/SRS/
- **Current admin routes:** `/admin/dashboard`, `/admin/data`, `/admin/colors`; invite management location TBD

## Related

- [SRS_UI_PLANNING_GAPS.md](../SRS_UI_PLANNING_GAPS.md) §16 — Navigation & Information Architecture
- [UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md](../../UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md) — current IA diagram
