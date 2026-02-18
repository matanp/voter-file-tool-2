# UI Architecture Review — Recommendations

**February 2026**

This document categorizes recommendations into **Quick Wins**, **Worthwhile Adjustments**, and **Large Refactors**. Each recommendation includes rationale, effort estimate, and links to related SRS documents.

**Principle:** Meaningful change only. Every item below justifies its impact.

---

## Quick Wins (< 0.5 day each)

These require minimal code changes and improve clarity, consistency, or discoverability.

### Q1. Fix Header Tab Highlighting for Reports

**Issue:** When user is on `/committee-reports` or `/voter-list-reports`, the Reports tab does not highlight. User may feel lost.

**Fix:** Update `header.tsx` pathname check for Reports tab:

```ts
// Current (problematic):
pathname?.endsWith('reports') &&
  !pathname?.endsWith('committee-reports') &&
  !pathname
    ?.endsWith('voter-list-reports')

    [
      // Recommended:
      ('/reports', '/committee-reports', '/voter-list-reports')
    ].some((p) => pathname?.startsWith(p));
```

**Effort:** 15 min | **File:** `apps/frontend/src/app/components/header.tsx`

---

### Q2. Fix Committee Tab Highlighting for Requests Page

**Issue:** When on `/committees/requests`, Committee tab is inactive.

**Fix:** Change Committee tab condition from `pathname?.endsWith("committees")` to `pathname?.startsWith("/committees")`.

**Effort:** 5 min | **File:** `apps/frontend/src/app/components/header.tsx`

---

### Q3. Link Orphaned Admin Pages or Remove

**Issue:** `/admin/dashboard` and `/admin/colors` have no navigation entry.

**Options:**

1. **Link:** Add Admin dropdown or sub-nav with Dashboard, Data, Colors (if colors is useful)
2. **Remove:** If unused, remove or redirect
3. **Merge:** Admin dashboard currently shows ElectionDates — duplicate of Data > Election Dates. Consolidate or repurpose dashboard as admin "home" with links to Data, etc.

**Recommendation:** Add `/admin` as landing page with cards/links to Data, (future) Meetings, Terms, etc. Redirect `/admin/dashboard` to `/admin` or merge. Add link to Data tab: "Admin" → `/admin` with sub-links. Defer Colors to dev docs if not user-facing.

**Effort:** 1–2 hrs

---

### Q4. Add "Generate Report" Links to Reports Page

**Issue:** User must navigate from Committees or Record Search to generate reports. Reports page only shows existing reports.

**Fix:** Add a compact "Generate Report" section with links:

- **Committee Roster** → `/committee-reports` (Admin only)
- **Voter List** → `/voter-list-reports` (Admin only; note: "Requires search from Record Search first")
- **Designated Petition** → `/petitions` (or link to petitions page)

**Effort:** 2–3 hrs | **File:** `apps/frontend/src/app/reports/page.tsx`

---

### Q5. Broaden Record Search Tab Matching

**Issue:** `pathname?.includes("record")` matches `/recordsearch` but could be brittle if route changes.

**Recommendation:** Use `pathname?.startsWith("/recordsearch")` for clarity.

**Effort:** 5 min

---

### Q6. Add Breadcrumb or "Back to Reports" on Report Generation Pages

**Issue:** On `/committee-reports` and `/voter-list-reports`, user may want to return to Reports hub. Currently there's a link in form; ensure it's visible.

**Check:** XLSXConfigForm has `Link href="/reports"`. VoterListReportForm has similar. Verify placement and visibility.

**Effort:** 15 min (review + tweak if needed)

---

### Q7. Fix Admin Data Link (Missing Leading Slash) — DONE

**Issue:** `href="admin/data"` was a relative URL. When user was on `/committees` or `/recordsearch`, clicking Data tab navigated to `/committees/admin/data` or `/recordsearch/admin/data` (404).

**Fix applied:** Changed to `href="/admin/data"` in `header.tsx`.

---

## Worthwhile Adjustments (0.5–2 days each)

These require moderate effort but significantly improve UX, consistency, or readiness for SRS features.

### A1. Unify "Exit Member" Pattern: Resignation + Removal

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §3, §4

**Current:** Remove is one-click, no reason. Planned: Resignation (form with date, method), Removal (form with reason enum).

**Recommendation:** Create shared "Exit Member" flow triggered from member card:

1. Modal/slide-over: "Resignation" vs "Removal"
2. **Resignation:** `resignationDateReceived`, `resignationMethod` (EMAIL, MAIL)
3. **Removal:** `RemovalReason` dropdown (PARTY_CHANGE, MOVED_OUT_OF_DISTRICT, INACTIVE_REGISTRATION, DECEASED, OTHER) + `removalNotes` when OTHER
4. Human-readable labels for enums
5. Both require confirmation before submit

**Consistency:** Mirrors planned pattern; establishes reusable modal form for member status changes.

**Effort:** 1–2 days | **Depends on:** Roadmap 1.2 (Membership Status)

---

### A2. Admin Override UX for Hard Stops

**SRS ref:** [SRS_GAPS_AND_CONSIDERATIONS](../SRS/SRS_GAPS_AND_CONSIDERATIONS.md) §3.1, [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §1

**Planned:** Admin can override eligibility hard stops when justified; must be logged.

**Recommendation:**

- When admin sees hard stop (e.g., "Not enrolled Democrat"), show "Override (requires reason)" checkbox or button
- On check: reveal "Override reason" text field (required)
- Submit includes `forceAdd: true` and `overrideReason` (stored in audit metadata)
- Follow DiscrepancyActionsMenu pattern: action in dropdown or secondary button, not inline checkbox
- **Scope:** Specify which hard stops are overridable (party, AD; "already in committee" might not be overridable)

**Effort:** 1 day | **Depends on:** Roadmap 2.1

---

### A3. Request Rejection with Reason

**SRS ref:** Roadmap 2.4 — bulk reject with `rejectionNote`

**Current:** RequestCard has Reject button; no reason collected.

**Recommendation:** On Reject, open modal or inline field for "Rejection reason (optional)". Store in `rejectionNote` when CommitteeMembership/request model supports it. Prepares for meeting-based flow.

**Effort:** 0.5 day | **Depends on:** Data model (1.2)

---

### A4. AddCommitteeForm: Hard Stop and Warning Display

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §10

**Planned:** Server returns `hardStops` and `warnings`. Hard stops block add; warnings allow proceed with yellow banner.

**Recommendation:**

- **Hard stops:** Display as Alert (destructive) above submit / below search results. List all; disable Add when any present.
- **Warnings:** Yellow Alert banner, dismissible optional; allow submission.
- **Layout:** Add section between results and Add button: `{hardStops.length > 0 && <HardStopAlert />}` then `{warnings.length > 0 && <WarningBanner />}`.
- Ensure form layout doesn't get crowded; consider collapsible "Eligibility" section if many messages.

**Effort:** 1 day | **Depends on:** Roadmap 2.1, 2.2

---

### A5. AddCommitteeForm: Optional Email/Phone

**SRS ref:** Roadmap 2.1a

**Planned:** Optional email and phone during submission; stored in `submissionMetadata`.

**Recommendation:** Add collapsible "Contact info (optional)" section below voter selection. Fields: Email, Phone. Validate email format if provided. Submit with `email`, `phone` in request body.

**Effort:** 0.5 day | **Depends on:** Roadmap 1.2 (submissionMetadata)

---

### A6. Remove Member: Add Confirmation

**Current:** One-click remove, no confirmation. Reversible only by re-adding.

**Recommendation:** Add confirmation dialog: "Remove [Name] from committee? This action can be undone by adding them back." Or, when Removal flow (A1) is implemented, Remove opens the Exit flow with Removal as default.

**Effort:** 0.5 day

---

### A7. CommitteeSelector: Vacancy and Weight Summary Block

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §11, Roadmap 3.1a

**Planned:** Show "2 open seats" or "Full" and "Designation weight: X.XX".

**Recommendation:** Add 1–2 line summary block above member cards. Placement: between header and member list. Copy: "X open seats" or "Full (4/4)". Weight: "Designation weight: X.XX" when 2.7 exists; otherwise "—" or hide. Keep compact for future table redesign.

**Effort:** 0.5 day | **Depends on:** 1.2 (vacancy count), 2.7 (weight)

---

### A8. Leader Empty States

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §12, Roadmap 3.1

**Planned:** Leader with no jurisdictions sees "Contact admin to get assigned." Assigned but no committees: "No committees in your jurisdiction."

**Recommendation:**

- When `committeeLists` empty due to no jurisdictions: "Contact an administrator to be assigned committee access."
- When assigned but no committees in DB: "No committees in your jurisdiction."
- Ensure CommitteeSelector receives empty list and renders appropriate message.

**Effort:** 0.5 day | **Depends on:** Roadmap 3.1 (jurisdiction model)

---

### A9. Admin IA: Introduce Sidebar or Sub-Navigation

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §16

**Planned:** Meetings, Terms, Users, Eligibility, Petition Outcomes, Audit.

**Recommendation:** Create `/admin` layout with sidebar:

- Data (current Admin Data content)
- Meetings (when 2.4)
- Terms (when 1.1)
- Users (when 3.1)
- Eligibility Flags (when 2.8)
- Petition Outcomes (when 2.6)
- Audit (when 3.5)

Start with layout + placeholder sections; implement as Roadmap items land. Resolve orphaned dashboard/colors: merge dashboard into Data or admin home.

**Effort:** 1–2 days (layout + placeholders)

---

### A10. Report Parameters Matrix (Specification)

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §13

**Planned:** SignInSheet, DesignationWeightSummary, VacancyReport, ChangesReport, PetitionOutcomesReport.

**Recommendation:** Create spec table in docs:

| Report                   | Parameters         | Defaults     | Admin vs Leader |
| ------------------------ | ------------------ | ------------ | --------------- |
| SignInSheet              | jurisdiction, date | today        | Leader scoped   |
| DesignationWeightSummary | scope              | jurisdiction | Leader scoped   |
| VacancyReport            | scope, filters     | —            | Leader scoped   |
| ChangesReport            | dateRange          | last 30 days | —               |
| PetitionOutcomesReport   | term, dateRange    | active term  | —               |

Use when implementing each report form. Effort: 0.5 day (doc only).

---

## Large Refactors (3+ days each)

These require substantial design and implementation. Schedule for dedicated sprints.

### R1. Meeting-Based Confirmation Workflow (Replace Requests Page)

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §2, Roadmap 2.4

**Current:** One-off Accept/Reject per request on `/committees/requests`.

**Planned:** Create meeting → Select pending submissions → Bulk confirm / bulk reject. Rejection requires reason.

**Recommendation:**

1. New `/admin/meetings` page (or section under Admin)
2. Flow: Create Meeting (date, type, notes) → List of SUBMITTED memberships → Multi-select → Bulk Confirm / Bulk Reject
3. Reject: modal for rejection reason (required)
4. Meeting history: list past meetings with confirm/reject counts
5. **Transition:** Keep `/committees/requests` as simplified view that links to "Create Meeting" or "Confirm in Meeting" — or redirect to meetings with pending filter.
6. RequestCard-style display for pending items within meeting flow

**Effort:** 3–5 days | **Depends on:** 1.2, 2.4

---

### R2. Petition Outcome Entry Page

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §5, Roadmap 2.6

**Planned:** Admin enters petition challengers per LTED, records primary results (WON/LOST/TIE/UNOPPOSED), vote counts, dates.

**Recommendation:**

1. New page: `/admin/petition-outcomes` (distinct from `/petitions` form generation)
2. LTED selection (reuse CommitteeSelector cascading logic or similar)
3. Challenger entry: add by VRN/name search; list with outcome dropdown per challenger
4. Batch form for outcomes: WON_PRIMARY, LOST_PRIMARY, TIE, UNOPPOSED; vote count, primary date
5. Tie semantics: document clearly (one challenger TIE = weighted vacant seat)
6. History view: filter by term, LTED
7. IA: Under Admin sidebar as "Petition Outcomes"

**Effort:** 5–8 days | **Depends on:** 1.2, 1.3, 1.4, 2.6

---

### R3. BOE Eligibility Flagging Review Queue

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §6, Roadmap 2.8

**Planned:** After BOE import, flag members with party/AD/status mismatches. Admin reviews queue: Confirm removal vs Dismiss.

**Recommendation:**

1. Page: `/admin/eligibility-flags` or section under Admin Data
2. Table: member name, committee, flag reason, before/after values
3. Inline actions: Confirm removal | Dismiss
4. Detail expand: full before/after diff
5. Empty state: "No flags" + "Run eligibility check" button (manual trigger)
6. Batch actions: optional "Confirm selected" if Roadmap specifies

**Effort:** 3–5 days | **Depends on:** 2.8

---

### R4. CommitteeSelector Redesign (Table-Based, Multi-LTED)

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §15, Roadmap Future

**Planned:** Table with filters, multi-LTED overview, vacancy and weight per row. Full redesign.

**Recommendation:** Defer to post-v1. Document constraint: 3.1a summary block (vacancy, weight) must be reusable in table layout. When redesigning:

- Columns: City, LD, ED, vacancy, weight, member count, actions
- Filters: city, LD, ED, vacancy status
- Multi-LTED selection, drill-in to member list
- Responsive: consider collapse on mobile

**Effort:** 1–2 weeks | **Defer**

---

### R5. Audit Trail UI

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §14, Roadmap 3.5

**Planned:** `/admin/audit` — filterable table, detail view, export CSV/XLSX.

**Recommendation:**

1. Table columns: Timestamp, User, Action, Entity Type, Entity ID, Summary
2. Filters: user, action type, entity type, date range
3. Detail: expand row or modal for before/after values (structured or JSON)
4. Export: current filter scope
5. Pagination: page size 50, infinite scroll or paginated

**Effort:** 3–5 days | **Depends on:** 1.5 (Audit model)

---

### R6. Term Management UI

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §7, Roadmap 1.1

**Planned:** Admin creates terms (label, start, end, isActive). List, set active.

**Recommendation:** Section under Admin: list terms, create new, set one active. No edit/delete in v1. Validation: one active term.

**Effort:** 1–2 days | **Depends on:** 1.1

---

### R7. User Jurisdiction Assignment UI

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §8, Roadmap 3.1

**Planned:** Admin assigns cityTown + legDistrict (per term) to Leader users.

**Recommendation:** Page or section: User picker (dropdown of Leaders) → Add jurisdiction (cityTown, legDistrict, term) → List with remove. Validate uniqueness.

**Effort:** 2–3 days | **Depends on:** 3.1

---

### R8. LTED Crosswalk Import UI

**SRS ref:** [SRS_UI_PLANNING_GAPS](../SRS/SRS_UI_PLANNING_GAPS.md) §9, Roadmap 1.1b, Gaps 2.1

**Planned:** Import/update LTED-to-Assembly-District crosswalk. Format TBD.

**Recommendation:** Resolve Gaps 2.1 (format, source) first. Then: file upload with preview, or manual form. Place under Admin Data.

**Effort:** 1–2 days | **Depends on:** 1.1b, Gaps 2.1 resolution

---

## Summary Matrix

| ID  | Category   | Effort    | Depends On     |
| --- | ---------- | --------- | -------------- |
| Q1  | Quick Win  | 15 min    | —              |
| Q2  | Quick Win  | 5 min     | —              |
| Q3  | Quick Win  | 1–2 hrs   | —              |
| Q4  | Quick Win  | 2–3 hrs   | —              |
| Q5  | Quick Win  | 5 min     | —              |
| Q6  | Quick Win  | 15 min    | —              |
| Q7  | Quick Win  | 1 min     | — (done)       |
| A1  | Adjustment | 1–2 days  | 1.2            |
| A2  | Adjustment | 1 day     | 2.1            |
| A3  | Adjustment | 0.5 day   | 1.2            |
| A4  | Adjustment | 1 day     | 2.1, 2.2       |
| A5  | Adjustment | 0.5 day   | 1.2            |
| A6  | Adjustment | 0.5 day   | —              |
| A7  | Adjustment | 0.5 day   | 1.2, 2.7       |
| A8  | Adjustment | 0.5 day   | 3.1            |
| A9  | Adjustment | 1–2 days  | —              |
| A10 | Adjustment | 0.5 day   | —              |
| R1  | Refactor   | 3–5 days  | 1.2, 2.4       |
| R2  | Refactor   | 5–8 days  | 1.2–1.4, 2.6   |
| R3  | Refactor   | 3–5 days  | 2.8            |
| R4  | Refactor   | 1–2 weeks | Defer          |
| R5  | Refactor   | 3–5 days  | 1.5            |
| R6  | Refactor   | 1–2 days  | 1.1            |
| R7  | Refactor   | 2–3 days  | 3.1            |
| R8  | Refactor   | 1–2 days  | 1.1b, Gaps 2.1 |

---

## Recommended Implementation Order

**Phase 1 — Quick Wins (Do First):**

- ~~Q7 (Admin Data link)~~ — done
- Q1, Q2, Q5 (header tab highlighting)
- Q4 (Reports hub links)
- Q3 (admin orphans)
- Q6 (breadcrumbs review)

**Phase 2 — Alongside Roadmap Tier 1–2:**

- A4, A5 when 2.1, 2.2, 1.2 land
- A1, A2 when 2.1, 2.5, 2.3 land
- A3 when 1.2 lands
- A6 (confirmation) — independent
- A7 when 1.2, 2.7 land
- A9 (admin layout) — early to unblock new sections
- A10 (report matrix) — spec doc

**Phase 3 — With Roadmap Tier 3:**

- A8 when 3.1 lands
- R1 (meetings) with 2.4
- R2 (petition outcomes) with 2.6
- R3 (eligibility queue) with 2.8
- R5 (audit UI) with 3.5
- R6 (terms) with 1.1
- R7 (jurisdiction assignment) with 3.1
- R8 (crosswalk) with 1.1b

**Phase 4 — Defer:**

- R4 (CommitteeSelector full redesign)

---

_See also: [01_CURRENT_STATE.md](01_CURRENT_STATE.md), [02_INFORMATION_ARCHITECTURE.md](02_INFORMATION_ARCHITECTURE.md), [SRS_UI_PLANNING_GAPS.md](../SRS/SRS_UI_PLANNING_GAPS.md)._
