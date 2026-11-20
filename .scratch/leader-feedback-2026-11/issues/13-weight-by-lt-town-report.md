# 13 - Committee Weight by LT/Town report

Status: needs-triage

Blocked by: 02

## Why

Split from [05](05-monthly-reports-and-sign-in-sheet.md) on 2026-11-01. The past report
`Committee Weight 2025-12-18 v2.pdf` (in `data/fwdcommitteefilesfrom20251218executivecommittee.zip`) is a one-page,
countywide table: one row per LD (Rochester) or town, with **Base Weight** and **Current Weight**, plus a
`Committee Grand Total` row (83,015.00 / 81,393.75 on 2025-12-18). The title block reads `Monroe County Democratic
Committee / <date> Committee File / Committee Weight by LT/Town`.

Our `designationWeightSummary` is per ED and doesn't roll up to LD/town or show base and current weight side by
side.

## Notes for triage

- **Admin-only**, countywide.
- Base weight = the full weight of every seat. Current weight = the weight of occupied seats only. Confirm with the
  reporter once 02 settles per-seat weights.
- Could be a new countywide layout of `designationWeightSummary`, or a new report type.
- Part of the monthly bundle in [15](15-monthly-report-run.md).

## Comments

### 2026-11-17 - definitions from the reporter

Per [02](02-weights-per-seat-and-weight-report.md): `Weighted Vote` is per seat. Base Weight = `Weighted Vote` ×
petitioned seats in the ED. Current Weight = `Weighted Vote` × petitioned seats that are currently occupied
(whether appointees count is pending, see 02). Petitioned seats come from the 2026–2028 file via
[06](06-vacancy-report-petitioned-status.md), not from the old sheet's `Weighted Seats` column. New weights are
due in December.
