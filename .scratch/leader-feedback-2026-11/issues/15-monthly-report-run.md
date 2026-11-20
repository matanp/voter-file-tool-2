# 15 - Monthly report run

Status: needs-info

Blocked by: 12, 13, 14

## Why

Split from [05](05-monthly-reports-and-sign-in-sheet.md) on 2026-11-01. The reporter wants "the following monthly
reports", meaning the files sent after each executive committee meeting.

Decisions (2026-11-01):

- **Monthly means monthly**: the end state is a scheduled (cron) run.
- **MVP: a developer triggers the run manually.** The cron job comes later.
- **Admin-only.** All of these reports are countywide.

## The bundle

| File | Source |
| --- | --- |
| Adds | [12](12-adds-and-deletes-exports.md) |
| Deletes - Resignations | [12](12-adds-and-deletes-exports.md) |
| Committee Weight by LT/Town | [13](13-weight-by-lt-town-report.md) |
| Committee File (xlsx + pdf) | Not covered yet. [04](04-pick-report-export-fields.md) adds a 5-field picker only; the full 19-column roster (see 04's Comments) needs its own spec here |
| Vacant Seats | [14](14-vacant-seats-weighted-export.md) |

## Open questions

- What period does a run cover: the calendar month, or since the last executive committee meeting?
- Where do the files go? Report rows in the app, an email to Admins (depends on `.scratch/email-sending/`), or both?
- What should the cron job do if a run fails or finds no changes?

## Comments
