# 05 - Monthly reports and sign-in sheet format

Status: resolved

## Attachments (in the gitignored `data/` folder)

- `data/fwdcommitteefilesfrom20251218executivecommittee.zip`: past reports from the 2025-12-18 executive committee
  meeting:
  - `Deletes - Resignation - Exec Committee 2025-12-18 v2.xlsx`
  - `Adds - Exec Committee 2025-12-18 v2.xlsx`
  - `Committee Weight 2025-12-18 v2.pdf`
  - `Commitee File 2025-12-18 v2.pdf`
  - `Committee File 2025-12-18 v2.xlsx`
  - `Vacant Seats 2025-12-18 v2.xlsx`
- `data/Brighton_09282026102755.pdf`: preferred sign-in sheet format

## Ask (verbatim)

> We would also ideally have the following monthly reports.
>
> Below are the reports that have been sent out in the past after executive committee meetings.

> I have also attached the sign in sheet format that I prefer.

## Comments

### 2026-11-01 - triaged and split

This ticket mixed two things: a sign-in sheet redesign, and the past executive-committee reports. It was split:

- Sign-in sheet (Brighton format, alphabetical, matching theirs) → [11](11-sign-in-sheet-redesign.md)
- Adds / Deletes exports → [12](12-adds-and-deletes-exports.md) (blocked by 01)
- Committee Weight by LT/Town → [13](13-weight-by-lt-town-report.md) (blocked by 02)
- Committee File → specified in [15](15-monthly-report-run.md) (uses the field picker from
  [04](04-pick-report-export-fields.md))
- Vacant Seats with weighted vote → [14](14-vacant-seats-weighted-export.md) (blocked by 02, 06)
- Monthly run → [15](15-monthly-report-run.md): a scheduled cron job eventually; MVP is a dev-triggered run.
  All of these reports are Admin-only.

"Email bounced, please update" on the Brighton sheet comes from the reporter's own email list. We have no bounce
data until the planned email-sending work (`.scratch/email-sending/`) lands, so 10 leaves it out.
