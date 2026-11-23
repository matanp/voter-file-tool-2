# Reports area — makeover review

Paths are relative to `apps/frontend/src`. Screenshots are in `scratchpad/shots/{dev,leader}/`.

## 1. Top makeover candidates

### A. `/reports` dashboard → one dense "Reports" list with status chips. Effort M, impact H.
**What it's for:** check whether a report you asked for is ready, download it, and start a new one.
**What's wrong at a glance:**
- Each finished report is a tall card, about 280px at 1280 and about 400px at 375. Five reports fill the whole of `dev/reports-1280.png`, and the 375 shot runs to almost 4,000px (`dev/reports-375.png`). Every card repeats the same low-value lines: "No description available", the generating user (always you, under "My Reports"), "File type:", "Size:". (`components/reports/ReportCard.tsx:289-460`, `ReportsList.tsx:110` pageSize=5)
- Running, failed and finished reports sit in three separate boxes: "Report Jobs", "My Reports" and "Public Reports". The same box is titled "Report Jobs" when it has jobs and "Pending Reports" with a green tick when it is empty (`PendingJobsIndicator.tsx:157-179`, compare `leader/reports-1280.png` with `dev/reports-1280.png`).
- The type badge is misleading. Committee Roster rows show a blue "Committee Report" badge, which is the Prisma enum name. Sign-In Sheet gets a grey badge (`ReportCard.tsx:267-276`).
- At 375 the row icons push the delete button off the right edge of the card (`dev/reports-375.png`, cards 2–5).
- "Public Reports" is usually empty but takes half the width at 1280, or a whole card at 375.

**Sketch.** Borrow the workspace's compact header, one-line stat summary, filter chips and dense rows with ⋯ menus:
```
Reports                                   [+ New report ▾]
6 reports · 1 running · 2 failed
[All] [Mine] [Public] [Failed]   🔍 name
─────────────────────────────────────────────────────────
● Sign-In Sheet – Nov 8        PDF 4.3MB  Nov 8   [⤓] ⋯
● Committee Roster – Nov 7     XLSX 27KB  Nov 7   [⤓] ⋯
◐ Vacancy Report – Nov 21      Generating…  ▓▓▓░          
✕ Vacancy Report – Nov 18      Failed      [Retry]    ⋯
```
- Each row has a status dot (green ready, spinner running, red failed), a type and format chip, size and a short date. The primary action (Download, or Retry) is an icon button. View, rename, make public and delete go in the ⋯ menu.
- Running and failed jobs become rows pinned to the top of the same list, not a separate card.
- Public becomes a filter chip, not a second column.
- At 375 each row is two lines: name, then "PDF · 4.3MB · Nov 8", with download and ⋯ on the right. That is roughly 64px per report instead of 400px.
- **Where the workspace pattern doesn't fit:** a list→detail split pane is overkill here. A report has nothing to show in a detail pane beyond its PDF, so View should open the file directly.

### B. Replace the "Generate Report" card grid and the 6 scoped form pages with a picker + drawer. Effort M, impact H.
**What it's for:** start a report.
**What's wrong:**
- The grid has 5 cards for a Leader and 9 for an Admin (`GenerateReportGrid.tsx:89-136`). Each card navigates to a full page that is mostly empty pink space (`dev/vacancy-reports-1280.png`, `changes-reports`, `petition-outcomes-reports`).
- For a Leader the committee is fixed, so the only real choice on most forms is Format (`leader/weight-summary-reports-375.png`, `leader/committee-roster-reports-375.png`). That makes three screens (dashboard, form, back to dashboard via the "Find your report in the Reports page" link) for one dropdown.
- The workspace already links "Generate report" to a separate page (`app/committees/workspace/CommitteeWorkspaceHeader.tsx:56`), which breaks the workspace's "actions in drawers" feel.

**Sketch.** "+ New report" opens a menu or popover listing the report types, each with a one-line description. Choosing one opens a right-hand Sheet, full screen below `md`, the same shell as `CommitteeActionDrawer.tsx`:
```
┌ New report: Vacancy Report ───────── ✕ ┐
│ Name   [Vacancy Report – Nov 21     ]  │
│ Format (●XLSX)(○PDF)   ← segmented     │
│ Scope  (Countywide)(●Jurisdiction)     │
│ Town   [Select ▾]                      │
│ Show   (●Vacant only)(○All)            │
│                         [Generate]     │
└────────────────────────────────────────┘
```
- On submit, close the drawer, toast, and a "Generating…" row appears at the top of list A. The user never leaves the page.
- `ScopedReportForm` already renders all 6 scoped types from one registry (`components/reports/ScopedReportPageShell.tsx`, `scopeReportUiRegistry.ts`), so moving the form into a Sheet is mostly a matter of where it is mounted.
- Keep the routes as deep links that open the drawer preselected, for bookmarks and for the workspace button. The workspace "Generate report" button can then open the same drawer with the selected committee prefilled.
- **Where it doesn't fit:** `/petitions` (candidate search plus a results table), `/committee-reports` (more than 40 field checkboxes and custom headers) and `/voter-list-reports` (only makes sense from Record Search). Keep these as full pages. Launch voter list from Record Search's results header, not from the grid.

### C. Bring the outlier forms onto one form shell. Effort S–M, impact M.
The 6 scoped forms are consistent with each other. The three outliers each look like a different app:
- **`/petitions`** has a white background where every other page is pink, sits at a 16px left margin where the others use 80px, and has no description. It uses pink-boxed search strips, mixed label sizes (`text-xl` "Party:" next to `text-sm` "Petition Name"), and inline "Label: [control]" rows (`app/petitions/page.tsx:34`, `GeneratePetitionForm.tsx:194-470`; `dev/petitions-1280.png`).
- **`/committee-reports`** uses big green accordion card titles ("Identification", "Address", …) that shout louder than the page title. There are 8 identical "Select All" buttons, and at 375 the checkbox lists run to almost 3,000px (`dev/committee-reports-375.png`).
- **`/voter-list-reports`** with no search shows a lone card with a green title and no button back to Record Search (`dev/voter-list-reports-1280.png`).

Fix: one `ReportFormLayout` with stacked label-above-control fields, quiet `text-sm font-medium` section labels, a sticky footer action bar, and an empty state that has a CTA. For the legacy committee report, collapse the field groups by default and show a selected-count chip per group ("Address · 3 of 11").

## 2. Other findings

| Page | Issue | Evidence | Suggested fix | Effort | Impact |
|---|---|---|---|---|---|
| All report pages | The pink page background is the theme's `--primary-foreground`, which is the *text-on-green-button* colour, misused as the page fill. It makes the app feel tinted or warning-like. | `components/layout/PageContainer.tsx:34`, `styles/globals.css:25`; every `*-reports-*.png` | Use a neutral `bg-background` or `bg-muted/30` like the committees workspace. One-line change, app-wide. | S | H |
| Scoped forms | The "Format" label sits inline and touching an unstyled native `<select>`, while City/Town uses a combobox. Two control styles side by side. | `ScopedReportForm.tsx:345-351, 433-438`; `dev/vacancy-reports-1280.png` | Use a segmented PDF/XLSX toggle, or the shadcn Select, with the label stacked above | S | M |
| Scoped forms | The "City/Town" label also renders inline beside its trigger, which is inconsistent with "Report Name" above it | same, l.433 | Stack the label above the control, as in the rest of the form | S | L |
| Committee Roster (Leader) | The page description mentions "(leaders) or … (admins)" to a Leader | `scopeReportUiRegistry.ts:19-22`; `leader/committee-roster-reports-375.png` | Use role-specific copy, or drop the parenthetical | S | M |
| Access denied | Three different treatments: a card (`ScopedReportPageShell.tsx:24-33`, `committee-reports/page.tsx:23`), bare text (`AdminPageAccessDenied` on `/petitions`), and `<div>Something went wrong</div>` (`petitions/page.tsx:30`) | `leader/petitions-375.png` vs `leader/petition-outcomes-reports-375.png` | One shared `AccessDenied` empty state with an icon and a "Back to Reports" link | S | M |
| Dashboard | Three "Refresh" buttons. Jobs already poll. | `dev/reports-1280.png` | One refresh in the list header, or none | S | L |
| Dashboard | "Committee Report (Advanced)" card is admin-only legacy, but it sits in the main grid as a peer of the others | `GenerateReportGrid.tsx:70-80` | Put it under an "Admin / advanced" group in the picker | S | L |
| Dashboard, 375 | Header copy "View and manage your reports and report generation jobs" plus a 2-line card subtitle take up the first screen | `leader/reports-375.png` | Compact header with a one-line stat summary, like the workspace | S | M |
| Sign-In Sheet | Button says "Generate PDF" where every other form says "Generate Report" | `dev/sign-in-sheet-reports-1280.png` | Use one label everywhere | S | L |

Nits (grouped):
- Page titles mix "…Reports" and "…Report", and "Designation Weight Summary Reports" wraps to 2 lines at 375.
- Leader titles are big green `primary-header` while the workspace uses a quiet black title.
- Generate-grid cards are uneven heights at 1280.
- The muted "Find your report in the Reports page" link is the only post-submit cue.

## 3. Shared-component / design-system implications
- `PageContainer` hard-codes the pink fill (`bg-primary-foreground`). Fix it once and every member page changes. This needs a neutral surface token.
- `PageHeader` / `.primary-header` (green 2xl bold) vs the workspace's compact black title plus stat line. Add a `compact` variant with a `summary` slot.
- A reusable **`StatusChip`** / status dot (ready / running / failed / pending) is needed here and in workspace pending requests.
- A reusable **dense `ListRow`** with a trailing primary icon action and a ⋯ menu, shared with workspace rows.
- **Sheet-based form shell** (`drawerParts.tsx` DrawerFooter) should be promoted out of `app/committees/workspace/drawer` into `components/ui` so reports can reuse it.
- Form primitives: replace raw `<select>` / native radios with shadcn Select / RadioGroup / segmented control, and set one label-above-control rule.
- One `EmptyState` (icon, line, CTA) and one `AccessDenied` component.
