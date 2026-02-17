# UI Architecture Review

**February 2026**

Comprehensive review of the voter-file-tool frontend UI: current state, information architecture, and recommendations. Produced in response to [SRS_UI_PLANNING_GAPS.md](../SRS/SRS_UI_PLANNING_GAPS.md) and alignment with [SRS_IMPLEMENTATION_ROADMAP.md](../SRS/SRS_IMPLEMENTATION_ROADMAP.md).

**Scope:** The review covers both SRS-gap-driven analysis and **codebase-derived analysis of the current UI** — layout patterns, responsive behavior, design consistency, and UX friction points observed in the implementation.

---

## Documents

| Document                                                           | Purpose                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [00_INVESTIGATION_PLAN.md](00_INVESTIGATION_PLAN.md)               | Scope, methodology, and investigation threads                       |
| [01_CURRENT_STATE.md](01_CURRENT_STATE.md)                         | As-is snapshot: routes, navigation, committee flows, reports, admin |
| [02_INFORMATION_ARCHITECTURE.md](02_INFORMATION_ARCHITECTURE.md)   | IA diagrams (Mermaid), current vs planned structure                 |
| [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md)                     | **Quick Wins**, **Worthwhile Adjustments**, **Large Refactors**     |
| [04_SRS_GAP_MAPPING.md](04_SRS_GAP_MAPPING.md)                     | Cross-reference of SRS UI gaps to recommendations                   |
| [05_CURRENT_UI_ANALYSIS.md](05_CURRENT_UI_ANALYSIS.md)             | **Codebase-derived** layout, responsive, design, and UX findings    |
| [PARALLEL_INVESTIGATION_PLANS.md](PARALLEL_INVESTIGATION_PLANS.md) | Task breakdowns for parallel sub-agent execution                    |

---

## Quick Reference

### Priority Actions

1. **Immediate:** ~~Fix Admin Data link~~ (done), header tab highlighting (Q1, Q2) — ~20 min
2. **This week:** Add Generate Report links to Reports page (Q4), resolve admin orphans (Q3)
3. **With Roadmap:** Implement recommendations A1–A10, R1–R8 as dependencies land

### Key Findings (SRS Gaps)

- Reports tab doesn't highlight on committee-reports or voter-list-reports
- Admin dashboard and colors pages are orphaned
- No hub for report generation discovery
- Remove has no confirmation; no resignation/removal reasons
- AddCommitteeForm needs hard stops, warnings, email/phone per SRS

### Key Findings (Current UI — see 05_CURRENT_UI_ANALYSIS.md)

- ~~**Bug:** Admin Data link `href="admin/data"`~~ — fixed
- Requests page fixed at `w-96` — too narrow for accordion content
- Committee member cards `min-w-[600px]` force horizontal scroll on mobile
- VoterCard uses hardcoded colors; layout/container patterns vary across pages

### Diagrams

- Current IA: [02_INFORMATION_ARCHITECTURE.md §1](02_INFORMATION_ARCHITECTURE.md#1-current-ia-diagram)
- Proposed v1 IA: [02_INFORMATION_ARCHITECTURE.md §6](02_INFORMATION_ARCHITECTURE.md#6-mermaid-full-proposed-ia-v1)

### Current UI Quick Fixes (05_CURRENT_UI_ANALYSIS.md)

- ~~U1: Admin Data link~~ — done
- U2–U5: Requests width, member cards responsive, loading skeleton, VoterCard tokens

---

## Related Documents

- [SRS_UI_PLANNING_GAPS.md](../SRS/SRS_UI_PLANNING_GAPS.md) — Gap inventory
- [SRS_IMPLEMENTATION_ROADMAP.md](../SRS/SRS_IMPLEMENTATION_ROADMAP.md) — Planned work
- [SRS_GAPS_AND_CONSIDERATIONS.md](../SRS/SRS_GAPS_AND_CONSIDERATIONS.md) — Open questions
- [EXTENSIBILITY_ANALYSIS.md](../EXTENSIBILITY_ANALYSIS.md) — Config/extensibility (light touch in this review)
