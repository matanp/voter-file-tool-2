# 07 - Reports hub as one dense list

Status: needs-triage

Blocked by: 01, 03, 05

Part of [ui-makeover](../spec.md).

## Problem

`/reports` stacks three boxes: Report Jobs, My Reports and Public Reports.
- **Tall cards.** Each finished report is about 280px at 1280 and about 400px at 375. Five reports make the phone page about 4,000px tall.
- **Repeated low-value lines.** Every card repeats "No description available", the user's own name, "File type:" and "Size:" (`components/reports/ReportCard.tsx:289-460`). The page size is 5 (`ReportsList.tsx:110`).
- **Changing title.** The jobs box switches between "Report Jobs" and "Pending Reports" (`PendingJobsIndicator.tsx:157-179`).
- **Too many Refresh buttons.** There are three.
- **Clipping at 375.** The delete icon is cut off.

## Proposal

```
Reports                                            [+ New report ▾]
6 reports · 1 running · 2 failed
[All] [Mine] [Public] [Failed]
● Committee roster   PDF  345 KB  Nov 7          [Download]  ⋯
◌ Vacancy report     generating…  Nov 18                      ⋯
✕ Sign-in sheet      failed       Nov 18           [Retry]    ⋯
```

- Compact `PageHeader` with live counts. Filter chips replace the separate Public column.
- Running and failed jobs sit at the top of the same list. Each row has a `StatusBadge`, a type and format chip, size and date, a primary action, and a ⋯ menu (view, rename, visibility, delete).
- At 375 a row is two lines, about 64px.
- One refresh, or automatic polling while jobs run.
- No detail pane: View opens the file.

## Acceptance

- One list replaces the three boxes. At least 10 reports are visible per 1280 screen.
- No repeated placeholder text. Failed jobs offer retry or delete in the row (see reports-polish/01).
- Leader and Admin views were both checked at 375 and 1280.

Evidence: reviews/reports.md §1A.

## Comments

### 2026-11-21

Prototyped on `proto/ui-makeover` and approved in stakeholder review. No changes requested.
