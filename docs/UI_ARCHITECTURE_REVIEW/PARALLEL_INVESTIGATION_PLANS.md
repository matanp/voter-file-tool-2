# Parallel Investigation Plans for Sub-Agents

**February 2026**

This document provides concrete task breakdowns for parallel investigation. Each plan can be executed independently by a different agent or contributor. Outputs feed into [01_CURRENT_STATE.md](01_CURRENT_STATE.md), [02_INFORMATION_ARCHITECTURE.md](02_INFORMATION_ARCHITECTURE.md), and [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md).

---

## Plan A: Route & Navigation Audit

**Objective:** Map all routes, entry points, and navigation logic.

**Tasks:**

1. Run `find apps/frontend/src/app -name "page.tsx"` and list each route
2. For each route: document purpose, access control (AuthCheck, hasPermissionFor), and entry points (links, redirects)
3. Read `header.tsx` and document tab pathname conditions
4. Search for `href=`, `Link`, `router.push`, `router.replace` to find all navigation paths
5. Identify routes with zero incoming links (orphans)
6. Document admin section: which routes exist under /admin, how they're reached

**Commands to run:**

```
cd apps/frontend
rg "href=|Link href|router\.(push|replace)" --type-add 'tsx:*.tsx' -t tsx src
rg "pathname" src
```

**Deliverable:** Section 1 (Route Inventory) and Section 2 (Navigation Structure) of 01_CURRENT_STATE.md.

---

## Plan B: Committee Flow Deep Dive

**Objective:** Trace committee-related user flows end-to-end.

**Tasks:**

1. Read `CommitteeSelector.tsx` — document cascading select logic, member card structure, remove flow
2. Read `AddCommitteeForm.tsx` — document search → results → add flow; identify eligibility checks (client-side)
3. Read `CommitteeRequestForm.tsx` — document add vs replace flows, fields, API
4. Read `RequestCard.tsx` — document accept/reject flow, API
5. Read `api/committee/add`, `remove`, `requestAdd`, `handleRequest` — document request/response shape
6. Compare to `DiscrepancyActionsMenu` — note confirmation patterns
7. Document empty states and error handling

**Deliverable:** Section 3 (Committee Flows) of 01_CURRENT_STATE.md.

---

## Plan C: Reports & Admin Flows

**Objective:** Map report generation and admin workflows.

**Tasks:**

1. List all report types (ldCommittees, voterList, designatedPetition, etc.) and where each is generated
2. Trace path from Record Search "Export" to voter-list-reports
3. Trace path from "Generate Committee Report" to committee-reports
4. Document Reports page: what it shows, what links exist
5. Read `AdminDataClient` — list all tabs and their components
6. Check admin/dashboard and admin/colors — what do they render, who links to them
7. Document SpecialReports tab content (if any)
8. Map privilege checks for each report type

**Deliverable:** Section 4 (Reports), Section 5 (Admin) of 01_CURRENT_STATE.md.

---

## Plan D: SRS Gap Cross-Reference

**Objective:** Map SRS_UI_PLANNING_GAPS.md items to current implementation.

**Tasks:**

1. For each numbered gap in SRS_UI_PLANNING_GAPS (1–17), create a row:
   - Gap ID, Title
   - Current state (implemented / partial / not started)
   - Location in codebase (file, component)
   - Roadmap dependency
   - Recommendation reference (from 03_RECOMMENDATIONS)
2. For Admin Override (Gap 1): current backend support? API shape?
3. For Meeting Record (Gap 2): current CommitteeRequest flow — what changes?
4. For Resignation (Gap 3), Removal (Gap 4): current remove flow
5. For Petition Outcome (Gap 5): overlap with /petitions
6. For BOE Eligibility (Gap 6): overlap with CommitteeUploadDiscrepancy
7. Continue for all gaps

**Deliverable:** Table or section in 02 or 03, or new file SRS_GAP_MAPPING.md.

---

## Plan E: Pattern & Consistency Review

**Objective:** Identify UI patterns and inconsistencies.

**Tasks:**

1. **Modals / Slide-overs:** Where are they used? (CommitteeRequestForm, etc.) — Sheet, Dialog, custom?
2. **Forms:** Inline vs modal — AddCommitteeForm inline, CommitteeRequestForm modal. Document pattern.
3. **Confirmation:** Which actions have confirmation? Remove — no. Discrepancy — no. Accept/Reject — no. Document.
4. **Error display:** Toast only? Inline? Per-field?
5. **API mutation pattern:** useApiMutation usage — success toast, error toast, loading state. Consistent?
6. **Privilege gating:** How is Admin vs RequestAccess vs ReadAccess applied? AuthCheck, hasPermissionFor, conditional render
7. **Empty states:** CommitteeSelector, ReportsList, AdminData — what messages?
8. **Accessibility:** Any aria labels, focus management, keyboard nav in new forms?

**Deliverable:** Section 6 (Component Patterns) of 01_CURRENT_STATE; consistency notes for 03_RECOMMENDATIONS.

---

## Plan F: AddCommitteeForm Layout Analysis

**Objective:** Prepare for SRS 2.1, 2.1a, 2.2 additions.

**Tasks:**

1. Sketch current AddCommitteeForm layout: search form → results table → add buttons
2. Identify where hard stop messages would go (above/below results?)
3. Identify where warning banners would go
4. Identify where email/phone optional fields would go
5. Propose wireframe for: search → results → (optional) contact info → warnings → hard stops → submit
6. Check eligibility prefetch: when would GET /api/committee/eligibility be called? On voter select? Debounce?

**Deliverable:** Recommendation A4, A5 refinement; wireframe or spec for AddCommitteeForm enhancements.

---

## Plan G: Admin IA Expansion Spec

**Objective:** Design admin section structure for Roadmap additions.

**Tasks:**

1. List all planned admin features: Meetings, Terms, Users, Eligibility, Petition Outcomes, Audit, Crosswalk
2. Propose URL structure: /admin/data, /admin/meetings, /admin/terms, etc.
3. Propose layout: sidebar vs tabs vs dashboard cards
4. How does Data tab evolve? Keep invites, discrepancies, etc. Add crosswalk?
5. Where does "Run eligibility check" button go?
6. Document relationship: requests page vs meetings page

**Deliverable:** Section 5 (Proposed v1 IA) of 02_INFORMATION_ARCHITECTURE.md; refinement of A9.

---

## Execution Notes

- **Order:** Plans A, B, C can run in parallel. D depends on A–C for current state. E can run in parallel. F, G are focused follow-ups.
- **Merge:** Each plan produces structured output; merge into the main docs. Use unique section IDs to avoid conflicts.
- **Updates:** As implementation progresses, re-run plans to validate recommendations and update current state.

---

_Reference: [00_INVESTIGATION_PLAN.md](00_INVESTIGATION_PLAN.md)_
