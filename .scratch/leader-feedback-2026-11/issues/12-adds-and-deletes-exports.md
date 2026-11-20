# 12 - Adds and Deletes exports (match past executive committee files)

Status: needs-triage

Blocked by: 01

## Why

Split from [05](05-monthly-reports-and-sign-in-sheet.md) on 2026-11-01. After each executive committee meeting the
committee has sent out two spreadsheets (in `data/fwdcommitteefilesfrom20251218executivecommittee.zip`):

- `Adds - Exec Committee 2025-12-18 v2.xlsx`: `voter id`, `Committee`, `Serve ED`, `name`, `election type`
  (e.g. `Executive Committee Appointed 12/18/2025`).
- `Deletes - Resignation - Exec Committee 2025-12-18 v2.xlsx`: `Date`, `voter_id`, `committee`, `ED`, `name`,
  `Delete Reason` (e.g. `Resignation`).

Our nearest report is `changesReport` (Date, Member Name, City/Town, LD, ED, Change Type, Details). It's missing
the voter id, how the member joined, and a structured reason for leaving.

## Notes for triage

- **Admin-only.** These are countywide executive committee files.
- The reason for leaving depends on 01's exit reports. How the member joined (petitioned vs appointed) overlaps 06.
- These files are part of the monthly bundle in [15](15-monthly-report-run.md).

## Comments
