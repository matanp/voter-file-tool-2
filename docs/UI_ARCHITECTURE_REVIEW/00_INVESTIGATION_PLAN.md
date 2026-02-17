# UI Architecture Review — Investigation Plan

**February 2026**

This document defines the scope, methodology, and execution plan for the comprehensive UI architecture review of the voter-file-tool application. It is designed to support parallel investigation by multiple contributors.

---

## Objective

Produce a thorough analysis of:

1. **Current state** — Routes, components, layout, navigation, and patterns
2. **Recommendations** — Categorized as quick wins, worthwhile adjustments, and large refactors
3. **Alignment** — How current UI supports or conflicts with SRS/Roadmap plans ([SRS_IMPLEMENTATION_ROADMAP.md](../SRS/SRS_IMPLEMENTATION_ROADMAP.md), [SRS_UI_PLANNING_GAPS.md](../SRS/SRS_UI_PLANNING_GAPS.md))

**Principle:** Meaningful change only — not change for change's sake. Every recommendation must justify its impact.

---

## Scope

| In scope                                       | Out of scope                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| Frontend app structure (Next.js App Router)    | Backend API internals                                              |
| Navigation, routing, IA                        | Database schema design                                             |
| Component organization and patterns            | Extensibility config (light touch only per EXTENSIBILITY_ANALYSIS) |
| Admin vs Leader flows                          | Full accessibility audit                                           |
| Report generation UI flow                      | Performance profiling                                              |
| SRS-planned features and their UI implications |                                                                    |

---

## Methodology

1. **Map** — Inventory routes, components, and entry points
2. **Trace** — Follow user flows for key tasks (add member, handle request, generate report)
3. **Compare** — Current vs SRS/Roadmap; identify gaps and conflicts
4. **Recommend** — Prioritize by impact and effort; categorize clearly

---

## Investigation Threads (Parallel Work)

These threads can be executed in parallel by different people or tools.

### Thread A: Route & Navigation Audit

- [ ] List all page routes (`**/page.tsx`)
- [ ] Map header navigation and tab highlighting logic
- [ ] Identify orphan routes (no incoming links)
- [ ] Document admin section structure
- **Output:** `01_CURRENT_STATE.md` §Navigation

### Thread B: Committee Flow Deep Dive

- [ ] CommitteeSelector: cascading selects, member cards, remove flow
- [ ] AddCommitteeForm: search → results → add; eligibility checks
- [ ] Request flow: CommitteeRequestForm, RequestCard, handleRequest
- [ ] Compare to DiscrepancyActionsMenu pattern (confirmation, dropdown)
- **Output:** `01_CURRENT_STATE.md` §Committee Flows

### Thread C: Reports & Admin Flows

- [ ] Reports hub vs committee-reports vs voter-list-reports
- [ ] How users discover and generate each report type
- [ ] Admin Data tabs: invites, discrepancies, election dates, offices, special reports
- [ ] Admin dashboard and colors (usage, linkage)
- **Output:** `01_CURRENT_STATE.md` §Reports, §Admin

### Thread D: SRS Gap Cross-Reference

- [ ] For each item in SRS_UI_PLANNING_GAPS.md, identify current implementation state
- [ ] Map Roadmap items to affected UI surfaces
- [ ] Flag areas where current patterns conflict with planned patterns
- **Output:** `02_SRS_GAP_MAPPING.md` (or section in 03)

### Thread E: Pattern & Consistency Review

- [ ] Modal vs slide-over vs inline forms (resignation, removal, override)
- [ ] Error/warning display patterns
- [ ] API mutation + toast feedback pattern
- [ ] Privilege-gated visibility (Admin vs RequestAccess vs ReadAccess)
- **Output:** `03_RECOMMENDATIONS.md` §Consistency

---

## Deliverables

| Document                          | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `00_INVESTIGATION_PLAN.md`        | This document                                       |
| `01_CURRENT_STATE.md`             | As-is snapshot: routes, flows, components           |
| `02_INFORMATION_ARCHITECTURE.md`  | IA diagram, navigation structure, planned additions |
| `03_RECOMMENDATIONS.md`           | Quick wins, adjustments, refactors with rationale   |
| `PARALLEL_INVESTIGATION_PLANS.md` | Sub-agent task breakdown for parallel execution     |

---

## Dependencies

- [SRS_UI_PLANNING_GAPS.md](../SRS/SRS_UI_PLANNING_GAPS.md) — Gap inventory
- [SRS_IMPLEMENTATION_ROADMAP.md](../SRS/SRS_IMPLEMENTATION_ROADMAP.md) — Planned work
- [SRS_GAPS_AND_CONSIDERATIONS.md](../SRS/SRS_GAPS_AND_CONSIDERATIONS.md) — Open questions
- [EXTENSIBILITY_ANALYSIS.md](../EXTENSIBILITY_ANALYSIS.md) — Context (not heavily weighted)

---

## Completion Criteria

- [ ] All routes documented with purpose and access control
- [ ] All SRS UI gaps cross-referenced to current or planned implementation
- [ ] Recommendations categorized with effort and impact
- [ ] IA diagram includes current + planned admin sections
- [ ] No recommendation made without clear rationale
