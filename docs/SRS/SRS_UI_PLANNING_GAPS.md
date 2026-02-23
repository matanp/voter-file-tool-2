# SRS UI Planning Gaps

**February 2026**

This document identifies gaps in our implementation plans specifically related to the **UI of new features**. It complements [SRS_GAPS_AND_CONSIDERATIONS.md](SRS_GAPS_AND_CONSIDERATIONS.md) (which covers broader implementation gaps) and [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md).

These are areas that would benefit from more detailed design, wireframes, or specification before implementation to reduce rework and ensure consistent UX.

---

## Summary

| Category          | Count | Priority |
| ----------------- | ----- | -------- |
| Admin workflows   | 8     | High     |
| Leader workflows  | 5     | High     |
| Shared / forms    | 4     | Medium   |
| Reports & outputs | 3     | Medium   |
| Navigation & IA   | 2     | Medium   |

---

## Ticket Mapping (February 20, 2026)

| Gap Area | Tracking Ticket(s) |
| --- | --- |
| Admin override UX | [2.1](tickets/2.1-eligibility-validation.md) |
| Meeting confirmation workflow UI | [2.4](tickets/2.4-meeting-record-confirmation-workflow.md) |
| Resignation UI | [2.3](tickets/2.3-resignation-workflow.md) |
| Structured removal UI | [2.5](tickets/2.5-structured-removal-reasons.md) |
| Petition outcomes UI | [2.6](tickets/2.6-petition-primary-outcome-tracking.md) |
| BOE eligibility queue UI | [2.8](tickets/2.8-boe-driven-automatic-eligibility-flagging.md) |
| Term management UI | [1.1](tickets/1.1-committee-term-model.md), [1.R.17](tickets/1.R.17-phase1-ui-fixes.md) |
| Jurisdiction assignment UI | [3.1](tickets/3.1-jurisdiction-assignment-ui.md) |
| CommitteeSelector vacancy/weight and empty states | [3.1a](tickets/3.1a-committee-selector-vacancy-weight-empty-states.md) |
| Report UI additions (3.2-3.4) | [3.2](tickets/3.2-sign-in-sheet-report-ui.md), [3.3](tickets/3.3-designation-weight-summary-report-ui.md), [3.4](tickets/3.4-vacancy-changes-petition-reports-ui.md) |
| Audit trail UI | [3.5](tickets/3.5-audit-trail-ui-export.md) |
| Mobile/a11y baseline | [3.6](tickets/3.6-mobile-accessibility-baseline.md) |
| LTED crosswalk import UI | [3.7](tickets/3.7-lted-crosswalk-import-ui.md) |
| Admin IA/navigation | [IA-01](tickets/IA-01-admin-ia-v1-spec.md) |

---

## 1. Admin Override UX (Roadmap 2.1, Gaps 3.1)

**Status:** Tracked by [2.1](tickets/2.1-eligibility-validation.md)

**What's planned:** "Admin override flag or bypass for hard stops when justified, logged to audit trail."

**UI gaps:**

- No specification for **where** the override control appears — checkbox on AddCommitteeForm? Separate "Force add" button? Modal confirmation?
- No spec for **which** hard stops are overridable (party, AD, already in another committee — all? subset?)
- No copy/error-state design: e.g., when admin sees "Not enrolled Democrat" — what does the override flow look like? Does a reason/justification field appear?
- No consistency with existing admin patterns (e.g., DiscrepancyActionsMenu) — should override follow a similar confirmation pattern?

**Recommendation:** Add a short UI spec (1–2 pages) covering: placement, states, copy, and audit-log requirement (e.g., "Override reason" text field stored in metadata).

---

## 2. Meeting Record & Executive Committee Confirmation UI (Roadmap 2.4)

**What's planned:** "Admin workflow: Create meeting record → Select pending submissions → Bulk-confirm or bulk-reject. UI: meeting management page under `/admin`."

**UI gaps:**

- **Page structure:** No wireframe or hierarchy. Is it `/admin/meetings`? A sub-tab under `/admin/dashboard`? A modal launched from somewhere?
- **Meeting creation form:** Fields (date, type, notes) — layout and validation not specified.
- **Pending submissions selector:** How are SUBMITTED memberships displayed? Table with checkboxes? Grouped by LTED? Filters (date range, jurisdiction)?
- **Bulk actions:** "Confirm selected" / "Reject selected" — confirmation modal? Rejection requires a reason (rejectionNote) — inline or modal?
- **Meeting history:** Can admin view past meetings and which members were confirmed/rejected? No spec.
- **Context:** Current `RequestCard` shows one-off accept/reject per request. New model uses meeting-based bulk confirmation. Transition path and migration of UX not specified.

**Recommendation:** Define a meeting-centric flow: Create Meeting → Attach Pending Submissions → Bulk Confirm/Reject. Clarify relationship to existing `/committees/requests` page (does it remain? merge? redirect?).

---

## 3. Resignation Workflow UI (Roadmap 2.3)

**What's planned:** "Admin form in UI to capture resignation details (date received, method)."

**UI gaps:**

- **Entry point:** Where does "Record Resignation" live? Member card action? Dedicated page? Dropdown on CommitteeSelector member list?
- **Form design:** Two required fields (`resignationDateReceived`, `resignationMethod` enum). Layout, date picker behavior, and validation not specified.
- **Confirmation:** Does admin see a summary before submitting? Any "Are you sure?" for irreversible status change?
- **Feedback:** Success toast vs inline message. Does the member card immediately show "Resigned" with date? Styling for resigned members in the roster not specified.

**Recommendation:** Add UI flow: Member Card → "Record Resignation" action → Modal or slide-over with form → Submit → Member card updates to resigned state with visual distinction (e.g., muted/grayed).

---

## 4. Structured Removal with Reasons UI (Roadmap 2.5)

**What's planned:** "Admin form to select reason when removing a member. RemovalReason enum: PARTY_CHANGE, MOVED_OUT_OF_DISTRICT, INACTIVE_REGISTRATION, DECEASED, OTHER."

**UI gaps:**

- **Entry point:** Current `CommitteeSelector` has a "Remove" action. Does removal now open a form/modal instead of immediate removal?
- **Form design:** Dropdown for reason; `removalNotes` for OTHER — required when OTHER? Optional otherwise?
- **Copy:** User-friendly labels for enum values (e.g., "Party change" vs `PARTY_CHANGE`). No copy spec.
- **Consistency:** Resignation and removal are both "exit" flows but have different forms. Should they share a common pattern (e.g., "Exit Member" with sub-type: Resignation vs Removal)?

**Recommendation:** Specify removal as a modal (similar to resignation) triggered from member card. Define human-readable labels for all RemovalReason values.

---

## 5. Petition & Primary Outcome Tracking UI (Roadmap 2.6)

**What's planned:** "Admin workflow: Enter petition challengers for an LTED → Record primary results → Winners → ACTIVE; Losers → retained in history. Admin UI: petition outcome entry page."

**UI gaps:**

- **Page location:** "Petition outcome entry page" — `/admin/petitions`? `/admin/petition-outcomes`? Separate from existing `/petitions` (designated petition form generation)?
- **LTED selection:** How does admin pick the LTED? Same cascading dropdown as CommitteeSelector? Search?
- **Challenger entry:** How are petition challengers entered? Manual VRN/name search per challenger? Bulk upload? No spec.
- **Outcome entry:** Per-challenger: outcome (WON/LOST/TIE/UNOPPOSED), vote count, primary date. Table? Form per challenger? Batch form?
- **Tie handling:** "Tied seats are weighted but vacant" — how does admin record a tie? One challenger marked TIE? Two challengers for one seat?
- **History view:** Can admin see past petition outcomes? Filter by term/LTED?
- **Overlap with existing `/petitions`:** Current page generates designated petition PDFs. New page is for recording outcomes. Navigation and naming need clarification to avoid confusion.

**Recommendation:** Create a dedicated UI spec for petition workflow: LTED selection → Challenger list (add/edit) → Outcome entry (with clear tie semantics) → Summary before submit. Clarify relationship to petition form generation in IA.

---

## 6. BOE Eligibility Flagging Review Queue UI (Roadmap 2.8)

**What's planned:** "Admin reviews flagged members and confirms/dismisses each. Create pending review queue."

**UI gaps:**

- **Page location:** Where does the review queue live? New `/admin/eligibility-flags`? Section under `/admin/data`? Existing `CommitteeUploadDiscrepancy` has a flow — is this replacing it or augmenting?
- **Queue display:** List/table of flagged members. Columns: member name, committee, flag reason, details (before/after values). Sort/filter by reason, date, LTED?
- **Actions:** "Confirm removal" vs "Dismiss" — buttons, modals, confirmation copy not specified.
- **Detail view:** When admin clicks a flag — full before/after diff? Inline or separate panel?
- **Batch actions:** Can admin confirm/dismiss multiple at once? Roadmap doesn't specify.
- **Empty states:** No flags — what does the page show? "Run eligibility check" manual trigger — where is the button?

**Recommendation:** Define queue as a table with inline actions (Confirm / Dismiss). Add detail expansion for before/after. Specify manual "Run eligibility check" placement (e.g., Admin Data page).

---

## 7. Committee Term Admin UI (Roadmap 1.1)

**What's planned:** "Admin UI to create/manage terms."

**UI gaps:**

- **Page location:** `/admin/terms`? Sub-section of dashboard?
- **Create term form:** `label`, `startDate`, `endDate`, `isActive`. Validation: only one active term? Overlapping dates?
- **List view:** Table of terms with active indicator. Can admin deactivate a term? Activate another?
- **Edit/delete:** Can terms be edited after creation? Deleted? SRS says "immutable for term" for base committee — does that extend to the term record itself?
- **Default/seed term:** Migration creates "2024–2026". Does admin UI show it? Can they create the next term before migration?

**Recommendation:** Minimal v1 spec: list terms, create new term, set one as active. Deactivation of old terms (no delete). No edit of existing terms in v1.

---

## 8. User Jurisdiction Assignment UI (Roadmap 3.1)

**What's planned:** "Admin UI for assigning jurisdictions to users: select Leader user, assign one or more jurisdictions (cityTown + legDistrict per term)."

**UI gaps:**

- **Page location:** "Page or section under /admin (e.g., /admin/users)" — no `/admin/users` page exists today. Is this new? Combined with invite management?
- **User selection:** How does admin pick a user? Dropdown of users with Leader privilege? Search? Table of all users with role?
- **Jurisdiction assignment:** Add jurisdiction: cityTown + legDistrict (nullable for "all LD in city"). Term selection. Multiple jurisdictions per user — list with remove?
- **Validation:** Same user + term + cityTown + legDistrict = unique. How does UI prevent duplicates?
- **Leader with no jurisdictions:** Roadmap says show "Contact admin to get assigned" — where? CommitteeSelector when empty? Needs placement spec.
- **Invite flow:** When inviting a new Leader, can jurisdictions be assigned at invite time? Or only after they accept?

**Recommendation:** Add `/admin/users` (or extend invite management) with User → Jurisdictions table. Define add/remove jurisdiction flow. Specify empty-state message placement in CommitteeSelector.

---

## 9. LTED Crosswalk Import UI (Roadmap 1.1b, Gaps 2.1)

**What's planned:** "Admin UI or import path to load/update crosswalk data."

**UI gaps:**

- **Entry point:** Where does crosswalk import live? `/admin/data` (alongside voter import, committee upload)? New page?
- **Format:** Gaps doc says format undefined (CSV, Excel, manual?). UI depends on this — file upload vs manual form vs both.
- **Manual entry:** If fallback is manual — form with cityTown, legDistrict, electionDistrict, stateAssemblyDistrict, etc.? Single row or bulk?
- **Validation:** Column mapping for CSV — does admin map columns or assume fixed format?
- **Feedback:** Success/error handling. How many rows imported? Any validation failures?

**Recommendation:** Resolve Gaps §2.1 (format, source) first. Then specify: file upload with preview + column mapping (if CSV), or simple manual entry form for v1 fallback.

---

## 10. AddCommitteeForm Enhancements (Roadmap 2.1, 2.1a, 2.2)

**What's planned:**

- Display server-returned hard stop messages (2.1)
- Add optional email/phone fields (2.1a)
- Display warnings as yellow banners (2.2)

**UI gaps:**

- **Hard stop display:** "Clear error message" — inline under search? Above submit button? Per-field or single summary? Structured errors (e.g., multiple hard stops) — list or first only?
- **Email/phone fields:** Placement — in AddCommitteeForm and CommitteeRequestForm. Before or after voter selection? Optional "contact info" collapsible section?
- **Warning banners:** Yellow Alert — one per warning or combined? Dismissible? Always visible until submit?
- **Prefetch eligibility (Inactive Voter spec §4.5):** Optional `GET /api/committee/eligibility` — when to call? On voter select? Debounce? Loading state?
- **Form layout:** AddCommitteeForm currently has search → results → add. Adding email/phone and warning/error states — layout could get crowded. No wireframe.

**Recommendation:** Sketch form layout with all states: search → results → (optional) email/phone → warnings → hard stops → submit. Define when eligibility is called (prefetch vs on submit).

---

## 11. CommitteeSelector Vacancy & Weight Display (Roadmap 3.1a) — Resolved

**What's planned:** "Display summary: vacancy count (e.g., '2 open seats' or 'Full') and designation weight total."

**Resolved by [3.1a](tickets/3.1a-committee-selector-vacancy-weight-empty-states.md):** CommitteeSummaryBlock component defines placement (between district selectors and member list), copy variants (Full, 1 open seat, N open seats, All N seats vacant with color-coded badges), and weight display (rounded to 2 decimals, "—" when unavailable, tooltip for missingWeightSeatNumbers).

---

## 12. Leader Empty State (Roadmap 3.1) — Resolved

**What's planned:** "Leader with no jurisdictions: Show empty committee list and 'Contact admin to get assigned'."

**Resolved by [3.1a](tickets/3.1a-committee-selector-vacancy-weight-empty-states.md):** Two empty states implemented: (1) No jurisdictions assigned → "No Committee Access" / "You have not been assigned any jurisdictions. Contact your county administrator to get committee access." (replaces entire selector). (2) Jurisdictions assigned but no committees → "No Committees Found" with assigned areas list (dropdowns visible but disabled, empty card in member list area).

---

## 13. Report Generation UI Additions (Roadmap 3.2, 3.3, 3.4)

**Status:** 3.2 (Sign-In Sheet), 3.3 (Designation Weight Summary), and 3.4 (Vacancy, Changes, Petition Outcomes) done.

**What's planned:** New report types: SignInSheet, DesignationWeightSummary, VacancyReport, ChangesReport, PetitionOutcomesReport.

**UI gaps:**

- **Report picker:** Current report UI (e.g., committee-reports, voter-list-reports) — how are new types added? New tabs? Single page with type dropdown? Per-roadmap item placement?
- **Parameters per report:**
  - SignInSheet: Scope (jurisdiction/date)? Same as ldCommittees?
  - DesignationWeightSummary: Scope (county vs jurisdiction)?
  - VacancyReport: Scope, filters?
  - ChangesReport: Date range — required? Default?
  - PetitionOutcomesReport: Term? Date range?
- **Access control:** "Admin countywide; leader scoped to jurisdiction" — does UI auto-hide or disable scope options for leaders?
- **Naming:** Report type labels in UI (e.g., "Sign-in Sheet" vs `SignInSheet`) — consistent naming not specified.

**Recommendation:** Add a report UI matrix: report type → parameters → default values → leader vs admin behavior. Update reports page IA to accommodate new types.

---

## 14. Audit Trail UI (Roadmap 3.5)

**What's planned:** "Admin page: /admin/audit. Filterable table: user, action type, entity, date range. Detail view. Export CSV/XLSX."

**UI gaps:**

- **Table columns:** Which columns in the main table? Timestamp, user, action, entity type, entity ID, summary? beforeValue/afterValue in table or detail only?
- **Filters:** Filter UI — dropdowns? Date range picker? Multi-select for action types?
- **Detail view:** "Detail view showing before/after values" — modal? Slide-over? Inline expand? JSON pretty-print or structured diff?
- **Export:** Button placement. Export includes filtered results? All?
- **Pagination:** Large audit logs — infinite scroll? Page size?
- **Performance:** Index on timestamp, entity, user — but UI pagination/filtering strategy not specified.

**Recommendation:** Define table schema (columns), filter bar layout, and detail expansion pattern. Specify export scope (current filter).

---

## 15. CommitteeSelector Redesign (Future Considerations)

**What's planned:** "Table-based UI with filters, multi-LTED overview. Inline vacancy count and weight per row."

**UI gaps:**

- **Scope:** "Separate project" — but basic display (3.1a) must be "preserved in that redesign." No migration path from current card-based UI to table.
- **Table columns:** What appears in each row? City, LD, ED, vacancy count, weight, member count? Actions?
- **Multi-LTED selection:** Current flow: select city → LD → ED → see one committee. New: see many? Select one to drill in?
- **Filters:** City, leg district, election district, vacancy status — filter UX (dropdowns, chips, search)?
- **Responsiveness:** Current selector is used on committees page. Table on mobile?

**Recommendation:** Defer detailed spec until post-v1, but document the constraint: 3.1a summary block must be reusable in the future table layout.

---

## 16. Navigation & Information Architecture

**Gap:** Several new admin features (meetings, terms, jurisdictions, eligibility flags, audit) will add pages or sections. Current structure:

- `/admin/dashboard` — dashboard
- `/admin/data` — voter import, committee upload, discrepancies
- `/admin/colors` — colors
- Invite management (where?)

**UI gaps:**

- No IA for new admin sections. Will `/admin` get a sidebar or tab navigation? Nested routes?
- Committees flow: `/committees` (selector) and `/committees/requests` (request cards). After migration, requests become SUBMITTED memberships — does requests page remain? Does it show "pending confirmation" from a different angle?
- Report pages: `/reports`, `/committee-reports`, `/voter-list-reports`, `/petitions` — where do new report types go?

**Recommendation:** Create a simple IA diagram for v1: admin sections, committees sections, reports. Clarify requests-page fate post-migration.

**Ticket:** [IA-01 Admin IA v1 spec](tickets/IA-01-admin-ia-v1-spec.md)

---

## 17. Mobile & Accessibility

**Gap:** Roadmap mentions "Accessibility: If compliance required, plan accessibility audit" as post-v1 operational. No UI specs call out:

- Keyboard navigation for new modals/forms
- Screen reader support for status changes, warnings, errors
- Touch targets for admin actions on mobile
- Color contrast for warning (yellow) and error states

**Recommendation:** Note as pre-implementation checklist for each new UI: basic a11y (focus order, labels, ARIA where needed). Formal audit deferred to post-v1.

---

## Checklist: Pre-Implementation UI Specs to Add

| Item                             | Doc / Location          | Effort   |
| -------------------------------- | ----------------------- | -------- |
| Admin override UX                | New § or Gaps §3.1      | 0.5 day  |
| Meeting confirmation flow        | Roadmap 2.4 expansion   | 1 day    |
| Resignation form & entry point   | Roadmap 2.3 expansion   | 0.5 day  |
| Removal form & entry point       | Roadmap 2.5 expansion   | 0.5 day  |
| Petition outcome page            | New UI spec             | 1–2 days |
| BOE eligibility queue            | Roadmap 2.8 expansion   | 1 day    |
| Term management                  | Roadmap 1.1 expansion   | 0.5 day  |
| Jurisdiction assignment          | Roadmap 3.1 expansion   | 0.5 day  |
| Crosswalk import                 | After Gaps 2.1 resolved | 0.5 day  |
| AddCommitteeForm layout & states | Roadmap 2.1/2.2         | 0.5 day  |
| CommitteeSelector vacancy block  | Roadmap 3.1a            | 0.25 day |
| Leader empty states              | Roadmap 3.1             | 0.25 day |
| Report params matrix             | Roadmap 3.2–3.4         | 0.5 day  |
| Audit table & filters            | Roadmap 3.5             | 0.5 day  |
| Admin IA diagram                 | New doc                 | 0.5 day  |

**Total:** ~8–10 days of planning for UI clarity before or in parallel with implementation.

---

## Retirement Gate

This document can be removed from active SRS docs when every gap area in the ticket-mapping table above is covered by a `Resolved`/`Done` ticket and the checklist items are fully closed.

_This document should be updated as UI specs are added and gaps are resolved._
