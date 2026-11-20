# 14 - Vacant Seats export with weighted vote

Status: needs-triage

Blocked by: 02, 06

## Why

Split from [05](05-monthly-reports-and-sign-in-sheet.md) on 2026-11-01. The past report
`Vacant Seats 2025-12-18 v2.xlsx` (in `data/fwdcommitteefilesfrom20251218executivecommittee.zip`) has the columns
`LT Name`, `ED`, `Weighted Vote`, `Vacancy` (count). There's one row per ED with a vacancy (31 rows on 2025-12-18).

Our `vacancyReport` has seat counts and petitioned/non-petitioned splits but no weight.

## Notes for triage

- **Admin-only**, countywide.
- Needs per-seat weights (02) and correct petitioned status (06) before the numbers mean anything.
- Part of the monthly bundle in [15](15-monthly-report-run.md).

## Comments

### 2026-11-17 - definitions from the reporter

Per [02](02-weights-per-seat-and-weight-report.md): `Weighted Vote` is per seat. Base Weight = `Weighted Vote` ×
petitioned seats in the ED. Current Weight = `Weighted Vote` × petitioned seats that are currently occupied
(whether appointees count is pending, see 02). Petitioned seats come from the 2026–2028 file via
[06](06-vacancy-report-petitioned-status.md), not from the old sheet's `Weighted Seats` column. New weights are
due in December.
