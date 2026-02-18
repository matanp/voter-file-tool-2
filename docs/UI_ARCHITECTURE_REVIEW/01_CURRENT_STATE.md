# UI Architecture Review — Current State

**February 2026**

This document captures the as-is state of the voter-file-tool frontend: routes, navigation, component structure, and key user flows. It serves as the baseline for recommendations in [03_RECOMMENDATIONS.md](03_RECOMMENDATIONS.md).

---

## 1. Route Inventory

### Public / Authenticated Routes

| Route                  | Purpose                                                       | Access                       | Entry Point                                           |
| ---------------------- | ------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `/`                    | Homepage (HeroSection, FeaturesGrid, QuickActions, Footer)    | All                          | Direct, nav                                           |
| `/recordsearch`        | Voter record search (RecordsList, search form, results table) | Auth required                | Header "Record Search", QuickActions                  |
| `/committees`          | Committee selector + member list + add form                   | Auth; member data Admin-only | Header "Committee List", QuickActions                 |
| `/committees/requests` | Pending committee requests (accordion by committee)           | Admin only                   | Link from committees page when requests exist         |
| `/petitions`           | Generate designated petition form (PDF)                       | Auth                         | Header "Petitions", QuickActions                      |
| `/reports`             | Reports dashboard (My Reports, Public Reports lists)          | Auth                         | Header "Reports", QuickActions                        |
| `/committee-reports`   | Committee report config + generation (XLSX/PDF)               | Admin only                   | "Generate Committee Report" button on committees page |
| `/voter-list-reports`  | Voter list XLSX from search results                           | Admin only                   | "Export" from Record Search results                   |
| `/auth/invite/[token]` | Accept invite, set privilege                                  | Invitee                      | Email link                                            |
| `/auth/access-denied`  | Access denied message                                         | All                          | Redirect on auth failure                              |

### Admin Routes

| Route              | Purpose                                                                                  | Access                    | Entry Point                     |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------- | ------------------------------- |
| `/admin/data`      | Data management (tabs: Invites, Discrepancies, Election Dates, Offices, Special Reports) | Admin                     | Header "Data" tab               |
| `/admin/dashboard` | Election dates display                                                                   | Admin                     | **No header link** — orphaned   |
| `/admin/colors`    | Color palette reference                                                                  | Auth (no privilege check) | **No link anywhere** — orphaned |

### Other

| Route                  | Purpose             |
| ---------------------- | ------------------- |
| `/error`               | Error boundary page |
| `/sentry-example-page` | Sentry test page    |

---

## 2. Navigation Structure

### Header (`components/header.tsx`)

**Tabs (left to right):**

1. Record Search — `pathname?.includes("record")` (highlights /recordsearch, /recordsearch/\*)
2. Committee List — `pathname?.endsWith("committees")` (does NOT highlight /committees/requests)
3. Petitions — `pathname?.endsWith("petitions")`
4. Reports — `pathname?.endsWith("reports") && !committee-reports && !voter-list-reports`
5. Data — Admin only; `pathname?.endsWith("admin/data")`

**Observations:**

- Reports tab does **not** highlight when user is on `/committee-reports` or `/voter-list-reports`. User may feel lost.
- Committee tab does **not** highlight when on `/committees/requests`.
- Admin dashboard and colors have no navigation entry.

### Layout

- Root layout: `SessionProvider`, `GlobalContextProvider`, `VoterSearchProvider`, `Header` (in `<nav>`), `<main>`, `Toaster`
- No admin-specific layout or sidebar
- Single global header for all users

---

## 3. Committee Flows

### 3.1 CommitteeSelector

**Location:** `committees/CommitteeSelector.tsx`

**Structure:**

- Cascading selects: City → Leg District (Rochester only) → Election District
- Member list: cards with `VoterCard` + footer actions
- `AddCommitteeForm` below member list

**Member card actions:**

- **Admin:** "Remove from Committee" — calls `POST /api/committee/remove`, no confirmation, no reason
- **RequestAccess:** "Remove or Replace Member" — opens `CommitteeRequestForm` (replacement flow)

**Data flow:**

- `committeeLists` passed from page (server component)
- `fetchCommitteeList` fetches members via `GET /api/fetchCommitteeList`
- Remove mutation refetches list on success

**Empty states:**

- "Select a committee to view members." (no selection)
- "You don't have permission to view committee member details. Contact an administrator for access." (non-Admin)
- "No committee members found." (selected but empty)

### 3.2 AddCommitteeForm

**Location:** `committees/AddCommitteeForm.tsx`

**Flow:**

1. `RecordSearchForm` with extra search filters (city, LD, ED) — "Find Members to Add"
2. `VoterRecordTable` shows top 5 results with "Add to Committee" button per row
3. Button states: disabled when already in committee, in different committee, or committee full (4)
4. **Admin:** Direct add via `POST /api/committee/add`
5. **RequestAccess:** Opens `CommitteeRequestForm` to submit request

**Missing (per SRS):**

- No server-returned hard stop display (party, AD, etc.)
- No optional email/phone fields
- No warning banners (inactive voter, etc.)
- No prefetch eligibility call

### 3.3 CommitteeRequestForm / RequestCard

**CommitteeRequestForm** (modal/sheet): Used for add and replace flows. Collects `requestNotes`, submits via `POST /api/committee/requestAdd`.

**RequestCard** (committees/requests): One card per request. Shows add/remove voter names, request notes. Actions: Reject | Accept. No rejection reason field. No meeting reference.

**API:** `POST /api/committee/handleRequest` with `committeeRequestId` and `acceptOrReject`.

---

## 4. Reports Flows

### 4.1 Reports Dashboard (`/reports`)

- **PendingJobsIndicator** — shows user's pending/processing/failed reports
- **ReportsList** (My Reports) — paginated list, edit/delete/toggle public
- **ReportsList** (Public Reports) — view only

No links to **generate** committee or voter list reports. User must know to go to committees page or record search.

### 4.2 Committee Reports (`/committee-reports`)

- **XLSXConfigForm** — format (PDF/XLSX), report type (ldCommittees), field selection, name, auto-download
- **ReportStatusTracker** — polls for completion
- Link back to `/reports` after generation

**Entry:** Only via "Generate Committee Report" button on committees page. Not discoverable from Reports tab.

### 4.3 Voter List Reports (`/voter-list-reports`)

- **VoterListReportForm** — consumes search context from Record Search
- User must run search first, then click "Export" in RecordsList
- Navigates to `/voter-list-reports` with search data in context
- Link back to `/reports` after generation

**Entry:** Only from Record Search results. No direct link from Reports or header.

### 4.4 Petitions (`/petitions`)

- **GeneratePetitionForm** — designated petition PDF generation
- Separate flow; links to `/reports` when done

---

## 5. Admin Flows

### 5.1 Admin Data (`/admin/data`)

**Tabs (AdminDataClient):**

1. User Invites — create invite, list invites, delete
2. Committee Upload Discrepancies — table of discrepancies, DiscrepancyActionsMenu per row
3. Election Dates — CRUD
4. Office Names — CRUD
5. Special Reports — (content TBD; exists as tab)

**DiscrepancyActionsMenu pattern:** Dropdown with "Accept Discrepancy", "Accept and Update Address", "Reject Due to Discrepancy". Uses `useApiMutation` and toast feedback.

### 5.2 Orphaned Admin Pages

- **`/admin/dashboard`** — Renders `ElectionDates` (same as Data > Election Dates tab). No link from header or Data page.
- **`/admin/colors`** — Color reference grid. No link. Likely dev-only; no privilege check.

---

## 6. Component Patterns

### Consistent patterns

- **useApiMutation** — POST/PATCH/DELETE with `onSuccess`/`onError`, toast feedback
- **AuthCheck** — wraps pages with privilege requirement
- **withPrivilege** — API route wrapper
- **Card/CardHeader/CardContent/CardFooter** — standard layout
- **Dropdown menu** — DiscrepancyActionsMenu; similar could apply to member actions

### Inconsistent patterns

- **Confirmation:** Remove member = no confirmation; discrepancy accept/reject = no modal. RequestCard accept/reject = no confirmation.
- **Form placement:** AddCommitteeForm inline; CommitteeRequestForm modal/sheet
- **Error display:** Mostly toast; no inline error banners on forms

---

## 7. Privilege & Access

| Privilege     | Committees                                     | Reports      | Admin Data | Committee Reports | Voter List Reports |
| ------------- | ---------------------------------------------- | ------------ | ---------- | ----------------- | ------------------ |
| ReadAccess    | No add/view members                            | View reports | —          | —                 | —                  |
| RequestAccess | Add via request; remove/replace via request    | View reports | —          | —                 | —                  |
| Admin         | Full add/remove; view members; handle requests | Full         | Full       | Full              | Full               |

- **fetchCommitteeList** — Admin only (members are PII)
- **Data tab** — Admin only
- **committee-reports** — Admin only (via `hasPermissionFor`)
- **voter-list-reports** — Admin only (AuthCheck)

---

## 8. Data Flow Summary

```
Homepage
  → QuickActions / HeroSection links
  → Record Search | Committees | Petitions | Reports

Record Search
  → Search → Results → Export → /voter-list-reports (Admin)
  → Search context preserved in VoterSearchContext

Committees
  → CommitteeSelector (City → LD → ED)
  → Member cards (Remove / Remove or Replace)
  → AddCommitteeForm (search → add or request)
  → [Admin] Generate Committee Report → /committee-reports
  → [Admin] View Requests → /committees/requests

Reports
  → My Reports | Public Reports (list only)
  → No generate links; user navigates from context

Admin Data
  → Tabs: Invites | Discrepancies | Election Dates | Offices | Special Reports
  → DiscrepancyActionsMenu: Accept / Accept+Update / Reject
```

---

## 9. Known Issues (from codebase review)

1. **Schema typo:** `CommitteeRequest.committeList` (missing 't') — used in requests page
2. **Header tab highlighting:** Reports tab inactive on committee-reports, voter-list-reports
3. **Committee tab:** Inactive on /committees/requests
4. **Orphaned routes:** /admin/dashboard, /admin/colors
5. **Report discovery:** No hub to "Generate Committee Report" or "Export Voter List" from Reports page
6. **Request page width:** `w-96` may be narrow for accordion content

---

_Next: [02_INFORMATION_ARCHITECTURE.md](02_INFORMATION_ARCHITECTURE.md) for IA diagram and planned structure._
