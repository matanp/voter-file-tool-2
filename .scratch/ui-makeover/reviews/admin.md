# Admin pages: makeover review

Overall: Admin is functionally sound, with a tidy grouped sidebar, but it looks like a different, older app next to /committees. The three weakest points are (1) no hub or landing summary, (2) review queues that are long unfiltered lists with no status encoding or density, (3) config/import forms that waste width and have no "state of the system" context. Ranked within admin below.

## 1. Top makeover candidates

### A. Admin home + "Review queues" as a workspace  (M effort, H impact within admin)
**Now:** `/admin` just redirects to the Audit Trail (`src/app/admin/page.tsx:3`). The most useful thing in the sidebar, the "Pending review (2)" count (`AdminSidebar.tsx:41-47`), is the only live signal, and it is plain text "(2)". Nothing tells an admin what needs attention today: pending eligibility flags, discrepancy count, pending meeting submissions, last voter import date, active term. Evidence: `admin-1280.png` (lands on a 8,349-row log), sidebar in every shot.
**Redesign (landing at /admin, replacing the redirect):**
```
Admin   Term 2026-2028 (active) · Voter file: imported Oct 25 · LTED crosswalk: Oct 25
+- Needs attention ------------------------------------------------+
| Eligibility flags  [ 312 pending ]  >   Discrepancies [ 33 EDs ] >|
| Meeting submissions [ 2 pending ]   >   Missing committees  0  OK |
+- Data freshness -------------------------------------------------+
| Voter import  Oct 25  OK | Weighted table Oct 25 | Absentee --    |
+- Recent activity (audit, 5 rows) ------------------ View all -----+
```
Sidebar: replace "(2)" with a right-aligned count pill (amber when non-zero, hidden at zero), add status dots to the Import Data group (last-imported date as secondary text, like the committees list's x/y counts). This gives the same "lots of info, little text" scan that worked in /committees. Where it does not fit: Setup/Import are write-rarely pages; do not turn them into list/detail splits.

### B. Eligibility Flags (and Discrepancies) as a list -> detail split with chips  (M-L, H)
**Now:** `admin-eligibility-flags-1280.png` is 42,898 px tall (110,922 px at 375): hundreds of unpaginated, ~85px rows, every one the same words ("Assembly district mismatch", "Committee AD: unknown (no crosswalk row)") and every one a black "Review" button (`EligibilityFlagsTable.tsx:224-296`). Filters are two big full-width selects (`:176-215`); status is a yellow PENDING pill but there is no summary count by reason, and the 4 statuses are text. At 375 the Reason column is squeezed to ~1 word per line (`admin-eligibility-flags-375.png`), the table scrolls horizontally, and the Review button is off screen.
**Redesign:** borrow the committees workspace.
```
Eligibility flags · 2026-2028      312 pending · 40 confirmed · 12 dismissed   [Run check]
[Pending] [Confirmed] [Dismissed] [Auto-resolved]   [Reason v]  [Town v]  search
+- list (grouped by Town > ED) --------+- detail pane / drawer ------------+
| o BRIGHTON ED 7   4 flags            | Member, committee, seat            |
|   AD mismatch · Voter AD 135 · 9/13  | Why flagged (committee AD vs voter)|
|   Party mismatch · ...               | [Confirm] [Dismiss] note           |
```
- Status chips with counts replace the status select; reason shown as a small icon/colour tag, not repeated sentences; collapse identical reasons ("committee AD unknown, no crosswalk row" repeated ~300 times is really one root cause: crosswalk gap, so offer "group by reason" and a single banner "N flags: no crosswalk row for ED").
- Group by town/ED with a flag-count badge (same as committee rows), paginate or virtualise.
- Row opens the existing review dialog contents in a right-side pane (desktop) / bottom sheet (mobile). Row button becomes a chevron.
- Discrepancies (`admin-discrepancies-1280.png`): 33 collapsed accordions in a 260px column on a 1280 screen (`CommitteeUploadDiscrepancies.tsx:221` `w-max`), with the "no Voter ID" table below. Same fix: ED list on left with discrepancy-count badges and a town filter chip row, detail table on the right. It is also half-width at 375 and the accordion clips the first row label (East Rochester).

### C. Audit Trail: dense, scannable log  (S-M, M)
**Now:** `admin-audit-1280.png`: 5 filter controls and a lone Export button on separate rows (wraps to two rows), then 25 near-identical rows at ~73px each because Timestamp and Record type wrap to two lines. Summaries such as "Seat Petitioned (Backfill) - Committee seat cmtyz784" show a raw ID, and the same entry repeats up to 4 times in a row (`AuditTrailClient.tsx`). At 375 (`admin-audit-375.png`) filters stack to ~330px before the first row, and Summary is cut off completely (horizontal scroll), so the most informative column is invisible.
**Redesign:** one-line filter bar with chips (Today / 7d / 30d presets replace two date pickers; Action as multi-select chip), export tucked in an overflow menu; rows at ~44px: `10:46 PM  [icon] Seat petitioned (backfill) . ED label  . User`, date shown as a group header ("Nov 18") instead of in every row, action as a small coloured dot/tag (member events, seat events, imports), collapse consecutive identical events ("x4"); resolve committee-seat IDs to ED/town names; row tap opens the existing `AuditDetailDrawer`. On mobile make each row a 2-line card (summary on top, time . user . tag below), no horizontal table.

## 2. Other findings

| Page | Issue | Evidence | Suggested fix | Effort | Impact |
|---|---|---|---|---|---|
| Absentee Report, Voter Import (OVERFLOW) | Page is wider than the viewport at both 375 and 1280 (screenshot is 1580 px wide at "1280"; 430 at 375). Likely the `sr-only` file input in the shared form has no positioned ancestor, so it sits outside the layout box and extends scroll width. | `admin-absentee-report-1280.png`, `admin-voter-import-375.png`; `PresignedUploadReportForm.tsx:152` | Add `relative` to the form/card (or `overflow-x-hidden` on the layout wrapper) and verify. One fix covers both pages and Weighted Table | S | H (visible bug on a shared component) |
| Admin sidebar, mobile | Navigation is a lone floating hamburger at bottom-left; you cannot tell which admin page you are on, and it sits right on top of content. On desktop the active item is solid brand green (loud next to the quiet neutral palette). | `admin-users-375.png`; `AdminSidebar.tsx:106-111`, `:70` | Mobile: slim sticky sub-header "Admin . Users v" opening the same sheet. Desktop: active = subtle tinted bg + left bar, not solid fill | S | M |
| Sidebar | 14 items in 5 groups at ~40px each leaves almost no room; "Coming soon" support but no counts besides one. Item rows are 40px high with 4px gaps. | all `admin-*-1280.png` | Tighten to ~32px rows; right-aligned count pills (see A) | S | M |
| Election Config | Two stacked 544px-wide centered cards inside a left-aligned page (`max-w-xl mx-auto`), so the content floats mid-screen with 200px of dead space to the left; every row has a loud red filled Delete button; the test rows ("hello world", "abc") are 7 destructive-looking buttons in a column. | `admin-election-config-1280.png`; `ElectionDates.tsx:231`, `ElectionConfigTab.tsx:18` | Left-align; two-column layout (Dates / Offices) on desktop; Delete becomes a ghost trash icon (hover red) or row menu; add field + button inline on one row; past dates muted | S | M |
| Governance Config | A plain long stack of full-width inputs (a 1000px-wide number input for "4"), a checklist, and an inner "Pending changes" card with a greyed Save. Reasonable content, poor form layout. | `admin-governance-config-1280.png`; `GovernanceConfigClient.tsx` | Cap form at ~640px, group into labelled sections (Eligibility / Capacity / Leader messaging) with settings-style two-column label/control rows; make Save a sticky footer bar that appears only when dirty and shows the diff | M | M |
| Users | Plain 5-column table, empty below; Role is raw text (Developer/Leader), no status, jurisdiction count is a bare number; at 375 the Role column is cut off and Manage (the only action) is off screen. | `admin-users-1280.png`, `admin-users-375.png`; `UsersManagementClient.tsx` | Role as a tag (Developer grey, Admin dark, Leader green), invite status chip, jurisdictions as "3 areas" pill; on mobile render rows as cards with name + role tag and chevron to manage; add search/role chips once list grows | S-M | M |
| Committee Terms | Three tall cards before the term list; the term list (what you act on) is third. Info card has bold-less heading, tiny type; "Active" pill is the only status. | `admin-terms-1280.png`; `TermsManagement.tsx` | Put Terms list first (with Active badge, dates), Create Term behind a "New term" button/drawer; collapse the explanatory copy into an info popover | S | M |
| Meetings | Single-row list in a lot of white; "0 decision(s)" and "notes1" typography is unstructured. | `admin-meetings-1280.png`; `MeetingsManagement.tsx` | Date + type as title, a count badge "2 pending", status dot; group Upcoming/Past | S | L |
| Petition & Primary Outcomes | Wizard-like form: Term/Committee/Seat/Date stacked, an empty candidates table with header only. | `admin-petition-outcomes-1280.png` | Two-column field grid; empty state with "Add candidate" CTA in the table; hide table until seat is selected | S | L |
| LTED Crosswalk / Weighted Table / Voter Import | Import pages carry no state: crosswalk shows "Last imported" in small grey type; Voter Import form has no previous-import list; crosswalk rows are 67px tall with 659 rows in 27 pages and red Delete on every row; native "Choose File" control on LTED vs custom button elsewhere. | `admin-lted-crosswalk-1280.png`, `admin-voter-import-1280.png` | One shared "Import" card pattern (drop zone + last import summary + history list), row Delete in a menu, 44px rows, tighter paging | M | M |
| Shared page chrome | Headers inconsistent: Audit/Users/Meetings have a muted subtitle, others none; some pages use `p-6` + `section-header`, others another padding; descriptive text sits in cards or above. | compare headers across `admin-*-1280.png` | Shared `AdminPageHeader` (title, one-line stat/context line, right-side action slot) | S | M |

Nits (one line): mixed emoji (file/folder glyphs) in the upload buttons; Audit From/To labels sit at different baselines than the other filter labels; discrepancy accordion label clips at "ED-1" for long towns; Dev-tools "N" badge overlaps sidebar items (dev only, ignore).

## 3. Shared-component / design-system implications
- `AdminPageHeader` (title + one-line summary + action slot) and `AdminListPage` pattern (filter chips + dense rows + detail drawer) reused across Audit, Eligibility Flags, Discrepancies, Users, LTED rows.
- A `StatusBadge`/tag set (Pending amber, Confirmed red, Dismissed green, Resolved grey, role tags) in one place; eligibility currently hand-rolls colours (`EligibilityFlagsTable.tsx:59-64`) and prints the raw enum (`RESOLVED_BY_RESCAN`).
- A table component with responsive "card rows" below `md` (every admin table falls back to horizontal scroll at 375 with the key column hidden).
- Destructive actions: replace filled red `Delete` buttons with an icon/menu pattern plus confirm.
- Sticky save bar for config forms; shared `ImportCard` for upload pages (also fixes the `sr-only` overflow).
- Count pills in nav (sidebar, mobile sheet) that reuse the same style as the committees filter chips.
