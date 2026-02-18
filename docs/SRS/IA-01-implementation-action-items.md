# IA-01 Admin IA v1 — Implementation Action Items

**Source:** [IA-01-admin-ia-v1-spec.md](tickets/IA-01-admin-ia-v1-spec.md)
**Status:** Open
**Effort:** ~0.5 day (doc updates) + ~1–2 days (layout/sidebar implementation) + ~0.5 day (Data sub-tab restructuring)
**Roadmap ref:** [SRS_UI_PLANNING_GAPS.md](SRS_UI_PLANNING_GAPS.md) §16

---

## 1. Context

The current admin section is a single "Data" tab in the header linking to `/admin/data`, which uses an internal tab bar for 5 sub-sections (Invites, Discrepancies, Election Dates, Offices, Special Reports) in `AdminDataClient.tsx`. Two additional routes (`/admin/dashboard`, `/admin/colors`) exist but are orphaned with no nav links. As the roadmap adds 7+ new admin sections (Meetings, Terms, Users, Eligibility Flags, Petition Outcomes, Audit, Crosswalk Import), the flat tab approach becomes untenable.

This document consolidates implementation decisions and action items from IA-01 and related architecture docs ([02_INFORMATION_ARCHITECTURE.md](../UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md), [03_RECOMMENDATIONS.md](../UI_ARCHITECTURE_REVIEW/03_RECOMMENDATIONS.md)).

---

## 2. Decision Summary

These decisions are derived from the analysis in [02_INFORMATION_ARCHITECTURE.md §4–6](../UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md). They are listed here for reference and should be confirmed before implementation begins.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin navigation pattern | Sidebar layout at `/admin` | Tabs become crowded at 10+ items; sidebar scales and supports nested routes |
| Header "Data" tab | Rename to "Admin", link to `/admin` | Single entry point to admin sidebar |
| Requests page fate | Keep `/committees/requests` as simplified view; primary bulk workflow moves to `/admin/meetings` | Avoids breaking existing leader workflow while adding meeting-based confirmation |
| New report types location | Add to `/reports` hub as card grid or dropdown | Single reports entry point; contextual links remain (e.g., from committee view) |
| Petition naming | Header "Petitions" = form generation; Admin "Petition Outcomes" = outcome entry | Avoids confusion between two different petition concepts |
| Orphaned routes | Remove `/admin/dashboard` and `/admin/colors` or integrate into admin sidebar | Clean up dead routes |
| Invite management | Stays under Data unless 3.1 adds `/admin/users` — then consider moving invites there | Minimize churn for v1 |
| Admin landing page | Data content at `/admin` (root); no redirect, no separate dashboard | Move admin/data to admin; lowest effort |
| Sidebar behavior on mobile | Collapsible hamburger menu using `Sheet` (side: left) | Match app patterns; reuse existing Sheet component |
| Sidebar link visibility | Config-driven; show all planned sections with "coming soon" for unimplemented | Toggle visibility/state without code changes |
| Data sub-tab restructuring | Split "Special Reports" into "Voter Import" + "Absentee Report"; combine "Election Dates" + "Office Names" into "Election Config"; reorder by workflow | Current "Special Reports" tab conflates data import with report generation; Election Dates and Offices are both small CRUD forms that belong together |

---

## 3. Proposed v1 Route Map

```
Header Navigation:
├── Record Search        → /recordsearch
├── Committee List       → /committees
│   └── Requests         → /committees/requests
├── Petitions            → /petitions          (form generation)
├── Reports              → /reports            (hub + generated reports list)
│   ├── Committee Reports → /committee-reports
│   └── Voter List Reports → /voter-list-reports
└── Admin                → /admin              (sidebar layout)
    ├── Data             → /admin              (sub-tabs: Invites, Election Config, Voter Import, Discrepancies, Absentee Report)
    ├── Terms            → /admin/terms        (1.1)
    ├── Meetings         → /admin/meetings     (2.4)
    ├── Users            → /admin/users        (3.1)
    ├── Eligibility      → /admin/eligibility-flags (2.8)
    ├── Petition Outcomes → /admin/petition-outcomes (2.6)
    └── Audit Trail      → /admin/audit        (3.5)
```

---

## 4. Acceptance Criteria → Action Items

### AC1: IA Diagram Covering Admin, Committees, Reports

**Decision:** Use the diagrams already in `02_INFORMATION_ARCHITECTURE.md` (§4, §6). The document already defines:
- Admin sections (Data, Meetings, Terms, Users, Eligibility, Petition Outcomes, Audit)
- Reports hub with new report types
- Committees flow with requests and meeting linkage

**Action Items:**

| # | Action | Effort | Owner |
|---|--------|--------|-------|
| 1.1 | Add a brief "v1 IA Summary" section at the top of `02_INFORMATION_ARCHITECTURE.md` that links to the full diagrams and summarizes decisions below. | 15 min | — |
| 1.2 | Ensure `02_INFORMATION_ARCHITECTURE.md` diagrams are exported or viewable (Mermaid renders in GitHub/GitLab). | 5 min | — |

---

### AC2: Define Placement of New Admin Pages

**Decision:** Use flat nested routes under `/admin` with a **sidebar** layout. See route map in §3 above.

**Note:** Invite management stays under Data (existing User Invites tab) unless 3.1 adds distinct user management. If `/admin/users` is created for jurisdiction assignment, consider whether invites move there or remain in Data.

**Action Items:**

| # | Action | Effort | Owner |
|---|--------|--------|-------|
| 2.1 | Add or update the route table in `02_INFORMATION_ARCHITECTURE.md` §3 with the placements above. | 10 min | — |
| 2.2 | Create `/admin` layout with sidebar — see implementation details below. | 1–2 days | Dev |

**Implementation details (2.2):**

**Files to create/modify:**
- Create: `apps/frontend/src/app/admin/layout.tsx` — shared admin layout with sidebar
- Modify: `apps/frontend/src/app/components/header.tsx` — rename "Data" to "Admin", link to `/admin`

**Specifics:**
- Add a new layout component at `/admin/layout.tsx` that wraps all `/admin/*` routes
- **Data at `/admin`:** Move `AdminDataClient` content from `admin/data/page.tsx` into `admin/page.tsx`; remove or redirect `/admin/data` after migration
- **Config-driven sidebar:** Define `adminSidebarConfig` (e.g. in `apps/frontend/src/config/adminNav.ts`): `{ id, label, href, enabled: boolean }[]`. `enabled: true` → normal link; `enabled: false` → "coming soon" disabled state. Sidebar renders all items from config.
- Sidebar items (from config), e.g.:

```ts
// adminNav.ts
export const adminSidebarConfig = [
  { id: "data", label: "Data", href: "/admin", enabled: true },
  { id: "terms", label: "Terms", href: "/admin/terms", enabled: false },
  { id: "meetings", label: "Meetings", href: "/admin/meetings", enabled: false },
  // ...
] as const;
```

- **"Coming soon" disabled state** for `enabled: false` items:
  - Render as a non-clickable `<span>` (not a `<Link>`), with `text-muted-foreground` and `cursor-not-allowed`
  - Display a `<Badge variant="outline">` with text "Coming soon" inline to the right of the label, using `text-xs` sizing
  - Example visual: `Terms` `Coming soon` — label is dimmed, badge is a subtle outline pill
  - No tooltip needed; the badge is self-explanatory
  - The item still occupies its position in the sidebar so users can see what's planned
- Move `AuthCheck` with `privilegeLevel="Admin"` from individual admin pages into the layout (single auth gate for all `/admin/*` routes)
- Sidebar should highlight the active section based on `usePathname()`
- Use existing shadcn/ui components for sidebar styling consistency
- **On mobile:** Collapsible hamburger menu using `Sheet` component (`side: "left"`), toggled by a hamburger icon. Reuse `~/components/ui/sheet.tsx`; ensure `aria-label` and focus management for accessibility. Close on route change or overlay click.

---

### AC3: Clarify Admin Navigation — Sidebar vs Tabs vs Nested Routes

**Decision:**

- **Primary navigation:** `/admin` layout with **sidebar** (not tabs). Tabs would become unwieldy with 7+ sections.
- **Nested routes:** Use flat routes under `/admin`:
  - `/admin` — Data page with tabs within (Invites, Discrepancies, etc.); `/admin/data` removed after migration
  - `/admin/meetings`, `/admin/terms`, etc. — each a dedicated page
- **Header:** Keep single "Admin" header tab that links to `/admin` (landing). Sidebar visible when on any `/admin/*` route.

**Action Items:**

| # | Action | Effort | Owner |
|---|--------|--------|-------|
| 3.1 | Document in `02_INFORMATION_ARCHITECTURE.md` §5.1: "v1 uses sidebar; tabs rejected due to 7+ sections." | 5 min | — |
| 3.2 | Create `apps/frontend/src/app/admin/layout.tsx` with sidebar component. Sidebar items: Data \| Meetings \| Terms \| Users \| Eligibility \| Petition Outcomes \| Audit. (Combined with 2.2.) | 1 day | Dev |
| 3.3 | Resolve orphaned routes — see implementation details below. | 1–2 hrs | Dev |
| 3.4 | Update header tab: rename "Data" to "Admin", link to `/admin`. | 15 min | Dev |
| 3.5 | Update header active-tab highlighting for Admin: | 5 min | Dev |

**Header highlighting fix (3.4, 3.5):**

File: `apps/frontend/src/app/components/header.tsx`

```ts
// Current: exact match on '/admin/data'
// New: any route starting with '/admin' (includes /admin and /admin/terms, etc.)
pathname?.startsWith('/admin')
```

**Orphaned route cleanup (3.3):**

- **`/admin/dashboard`**: Contains `ElectionDates` and `ElectionOffices` components — these are already duplicated in Data. Remove the dashboard page or redirect to `/admin`.
- **`/admin/data`**: Remove after migrating content to `/admin` (see AC2).
- **`/admin/colors`**: Development utility for color reference. Either:
  - (a) Remove if no longer needed, or
  - (b) Add to admin sidebar under a "Dev Tools" section (only in development)

---

### AC4: Clarify Committees Flow — Requests Page Fate

**Decision:**

- **Keep** `/committees/requests` for v1 as a **simplified view** for one-off accept/reject.
- **Add** `/admin/meetings` as the **primary workflow** for meeting-based bulk confirmation.
- **Recommendation:** Keep both. Admins who prefer one-off actions use requests; those doing formal meetings use meetings page.

**Phased transition plan:**

1. **Phase 1 (now):** No changes to `/committees/requests`. It continues to work with the existing `CommitteeRequest` model.
2. **Phase 2 (with Roadmap 1.2 — Membership Status):** `/committees/requests` reads `CommitteeMembership` records with status `SUBMITTED` instead of `CommitteeRequest` records. Same UI, new data source.
3. **Phase 3 (with Roadmap 2.4 — Meeting Record):** `/admin/meetings` becomes the primary bulk confirmation workflow. `/committees/requests` remains as a read-only or simplified one-off view. Add a link from requests page: "For bulk confirmation, go to Meeting Management."

**Action Items:**

| # | Action | Effort | Owner |
|---|--------|--------|-------|
| 4.1 | Add §5.3 "Requests vs Meetings" to `02_INFORMATION_ARCHITECTURE.md` with the phased transition plan above. | 15 min | — |
| 4.2 | When implementing 2.4 (Meeting flow): Ensure requests page has a clear CTA to "Create Meeting" or "View in Meetings" for pending items. | 0.5 day | Dev |
| 4.3 | Fix Committee tab highlighting (see 03_RECOMMENDATIONS Q2): | 5 min | Dev |

**Committee tab highlighting fix (4.3):**

File: `apps/frontend/src/app/components/header.tsx`

```ts
// Current: exact match on '/committees'
// New: any route starting with '/committees'
pathname?.startsWith('/committees')
```

---

### AC5: Clarify Report Pages — Where New Report Types Go

**Decision:**

- **Reports Hub:** `/reports` becomes the central "Reports" page with:
  - My Reports | Public Reports (existing)
  - **"Generate Report"** dropdown or card grid linking to:
    - Committee Roster (PDF/XLSX) → `/committee-reports`
    - Voter List (XLSX) → `/voter-list-reports` (note: "Requires search from Record Search first")
    - Designated Petition → `/petitions`
    - Sign-In Sheet → (new; add when 3.2)
    - Designation Weight Summary → (new; add when 3.3)
    - Vacancy Report → (new; add when 3.4)
    - Changes Report → (new; add when 3.4)
    - Petition Outcomes Report → (new; add when 3.4)

- **Placement:** New report types are **entries from `/reports`** (Generate Report section). Each report type can have its own route (e.g., `/reports/sign-in-sheet`) or use a shared `/reports/generate?type=signInSheet` pattern. Recommend per-type routes for clarity.

- **Report parameters matrix:** Create spec table per SRS_UI_PLANNING_GAPS §13 — see A10 in 03_RECOMMENDATIONS.

**Action Items:**

| # | Action | Effort | Owner |
|---|--------|--------|-------|
| 5.1 | Add "Generate Report" links to `/reports` page per 03_RECOMMENDATIONS Q4. Start with Committee Roster, Voter List, Designated Petition. | 2–3 hrs | Dev |
| 5.2 | Create report parameters matrix doc (or add to `02_INFORMATION_ARCHITECTURE.md` or SRS_UI_PLANNING_GAPS): report type → parameters → defaults → Admin vs Leader. | 0.5 day | — |
| 5.3 | When implementing 3.2–3.4: Add new report type entries to Reports hub. | Per report | Dev |
| 5.4 | Fix Reports tab highlighting (see 03_RECOMMENDATIONS Q1): | 15 min | Dev |

**Reports tab highlighting fix (5.4):**

File: `apps/frontend/src/app/components/header.tsx`

```ts
// Current: excludes committee-reports and voter-list-reports
// New: include all report-related routes
["/reports", "/committee-reports", "/voter-list-reports"].some(p => pathname?.startsWith(p))
```

### AC6: Restructure Data Sub-Tabs

**Decision:**

The current 5 sub-tabs in `AdminDataClient.tsx` have two problems: "Special Reports" conflates unrelated functionality (Voter File Import + Absentee Ward/Town Report), and "Election Dates" / "Office Names" are separate tabs for small, related CRUD forms. Restructure into 5 cleaner tabs:

| Current Tab | → | New Tab(s) |
|-------------|---|------------|
| User Invites | → | **Invites** (unchanged) |
| Election Dates | → | **Election Config** (combined with Office Names) |
| Office Names | → | *(merged into Election Config)* |
| Special Reports | → | **Voter Import** (Voter File Import only) |
| | → | **Absentee Report** (Absentee Ward/Town Report only) |
| Committee Upload Discrepancies | → | **Discrepancies** (shortened label) |

**New tab order** (by workflow/frequency): Invites | Election Config | Voter Import | Discrepancies | Absentee Report

**Action Items:**

| # | Action | Effort | Owner |
|---|--------|--------|-------|
| 6.1 | Create `useFileUpload` hook — extract shared R2 presigned-URL upload logic from `SpecialReports.tsx`. | 1–2 hrs | Dev |
| 6.2 | Extract `VoterImport.tsx` and `AbsenteeReport.tsx` from `SpecialReports.tsx`; delete `SpecialReports.tsx`. | 1–2 hrs | Dev |
| 6.3 | Create `ElectionConfigTab.tsx` — renders `ElectionDates` + `ElectionOffices` with section headers. | 30 min | Dev |
| 6.4 | Update `AdminDataClient.tsx` — replace 5-tab structure with new 5-tab layout; shorten "Committee Upload Discrepancies" to "Discrepancies". | 30 min | Dev |

**Implementation details (6.1 — `useFileUpload` hook):**

File: `apps/frontend/src/hooks/useFileUpload.ts`

- Encapsulates: fetch presigned URL from configurable endpoint, upload to R2 via PUT, return `fileKey`
- Config: `{ endpoint: string; maxSize?: number }` — e.g. `/api/getCsvUploadUrl` (50MB) or `/api/getVoterFileUploadUrl` (500MB); `maxSize` for client-side validation before upload
- Returns: `{ file, fileKey, isUploading, error, setFile, upload, reset }`

**Implementation details (6.2 — component extraction):**

- `apps/frontend/src/app/admin/data/VoterImport.tsx` — Voter File Import form; uses `useFileUpload({ endpoint: '/api/getVoterFileUploadUrl', maxSize: 500 * 1024 * 1024 })`
- `apps/frontend/src/app/admin/data/AbsenteeReport.tsx` — Absentee Ward/Town Report form; uses `useFileUpload({ endpoint: '/api/getCsvUploadUrl', maxSize: 50 * 1024 * 1024 })`
- Delete `apps/frontend/src/app/admin/data/SpecialReports.tsx` after extraction

**Implementation details (6.3 — `ElectionConfigTab.tsx`):**

File: `apps/frontend/src/app/admin/data/ElectionConfigTab.tsx`

- Renders both `ElectionDates` and `ElectionOffices` components
- Clear section headers ("Election Dates", "Office Names"); vertical stack layout

**Files to create/modify:**

| Action | File |
|--------|------|
| Create | `apps/frontend/src/hooks/useFileUpload.ts` |
| Create | `apps/frontend/src/app/admin/data/VoterImport.tsx` |
| Create | `apps/frontend/src/app/admin/data/AbsenteeReport.tsx` |
| Create | `apps/frontend/src/app/admin/data/ElectionConfigTab.tsx` |
| Modify | `apps/frontend/src/app/admin/data/AdminDataClient.tsx` |
| Delete | `apps/frontend/src/app/admin/data/SpecialReports.tsx` |

**Note:** If this is done after AC2/AC3 (sidebar + Data migration to `/admin`), these file paths will be under `apps/frontend/src/app/admin/` rather than `apps/frontend/src/app/admin/data/`. Adjust accordingly.

**Mobile consideration:** 5-tab `TabsList` may wrap on narrow screens; add `overflow-x-auto` to the tab container if needed.

---

## 5. Implementation Sequence (Recommended Order)

| Order | Item | Source | Effort |
|-------|------|--------|--------|
| 1 | Update `02_INFORMATION_ARCHITECTURE.md` with v1 summary, route table, Requests vs Meetings (§5.3), sidebar decision | 1.1, 2.1, 3.1, 4.1 | 0.5 day |
| 2 | Fix header tab highlighting — Admin, Reports, Committees (3.5, 4.3, 5.4) | 03_RECOMMENDATIONS Q1, Q2, Q5 | ~30 min |
| 3 | Add "Generate Report" links to `/reports` (5.1) | 03_RECOMMENDATIONS Q4 | 2–3 hrs |
| 4 | Create report parameters matrix spec (5.2) | 03_RECOMMENDATIONS A10 | 0.5 day |
| 5 | Create `/admin` layout with sidebar (2.2, 3.2) + rename header tab (3.4) | 03_RECOMMENDATIONS A9 | 1–2 days |
| 6 | Resolve orphaned admin routes (3.3) | 03_RECOMMENDATIONS Q3 | 1–2 hrs |
| 7 | Restructure Data sub-tabs (6.1–6.4): extract `useFileUpload` hook, split Special Reports, combine Election Config | AC6 | 3–4 hrs |

**Items 2 and 5 can be done immediately (total: ~1 day).** They establish the admin sidebar pattern and fix existing nav bugs. Items 1, 3–4 are doc/spec work. Item 6 is a quick follow-up. **Item 7 should follow item 5** — the sidebar layout moves Data content to `/admin`, so restructuring the sub-tabs after avoids rework on file paths.

---

## 6. Deliverables Checklist

- [ ] `02_INFORMATION_ARCHITECTURE.md` updated with:
  - [ ] v1 IA summary section
  - [ ] Route placement table (§3 or equivalent)
  - [ ] §5.1 sidebar decision documented
  - [ ] §5.3 Requests vs Meetings phased transition
- [ ] Report parameters matrix created (new doc or section)
- [ ] Header tab highlighting fixes (Admin, Reports, Committees)
- [ ] Header "Data" tab renamed to "Admin"
- [ ] "Generate Report" links on `/reports` page
- [ ] `/admin` layout with sidebar (`apps/frontend/src/app/admin/layout.tsx`)
- [ ] Config-driven admin nav (`adminSidebarConfig`) with "coming soon" for unimplemented sections
- [ ] Sidebar hamburger menu on mobile (Sheet, side: left)
- [ ] `AuthCheck` moved from individual admin pages to admin layout
- [ ] Data content at `/admin`; `/admin/data` and orphaned routes (`/admin/dashboard`, `/admin/colors`) resolved
- [ ] Data sub-tabs restructured:
  - [ ] `useFileUpload` hook extracted (`apps/frontend/src/hooks/useFileUpload.ts`)
  - [ ] `SpecialReports.tsx` split into `VoterImport.tsx` + `AbsenteeReport.tsx`
  - [ ] `ElectionConfigTab.tsx` created (Election Dates + Office Names)
  - [ ] Tab order: Invites | Election Config | Voter Import | Discrepancies | Absentee Report
  - [ ] "Committee Upload Discrepancies" shortened to "Discrepancies"

---

## 7. Open Questions

1. ~~**`/admin` Data sub-tab restructuring:**~~ **Resolved — see AC6.** The sub-tabs stay within "Data" for v1 but are restructured: "Special Reports" splits into "Voter Import" + "Absentee Report"; "Election Dates" + "Office Names" merge into "Election Config". Shared upload logic extracted into `useFileUpload` hook. Promoting sub-tabs to sidebar items deferred to a future iteration.

---

## 8. References

| Doc | Purpose |
|-----|---------|
| [IA-01-admin-ia-v1-spec.md](tickets/IA-01-admin-ia-v1-spec.md) | Source ticket |
| [02_INFORMATION_ARCHITECTURE.md](../UI_ARCHITECTURE_REVIEW/02_INFORMATION_ARCHITECTURE.md) | Current IA, diagrams, planned routes |
| [03_RECOMMENDATIONS.md](../UI_ARCHITECTURE_REVIEW/03_RECOMMENDATIONS.md) | Q1–Q7, A9, A10 |
| [SRS_UI_PLANNING_GAPS.md](SRS_UI_PLANNING_GAPS.md) | §16 Navigation & IA, §13 Report params |
| [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md) | Roadmap refs (1.1, 2.4, 2.6, 2.8, 3.1, 3.2–3.5) |
