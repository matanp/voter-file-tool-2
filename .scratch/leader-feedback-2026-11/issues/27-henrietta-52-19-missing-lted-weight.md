# 27 - HENRIETTA LD 52 ED 19 has no LTED weight

Status: needs-info

## Why

Found after the PR #160 deploy on 2026-11-18. After re-importing `data/Base Committee Weight by LTED 20260109.xlsx`,
every active-term committee has an LTED weight except HENRIETTA LD 52 ED 19 (`CommitteeList.id` 4638 in
production).

Committee 4638 was created after the earlier weighted-table imports (ids from 4000 up were most likely added by
create-missing-committees). The 20260109 sheet has no row for LTED 52019, so the import can't fill it.

Effect: its seats have no weight, its Weight Report row shows "—" (PDF) or a blank cell (XLSX), and any
petitioned seat on it is listed under missing weights.

## Question for the chair (needs-info)

- Does Henrietta ED 19 exist for this term, and what is its per-seat `Weighted Vote`?
- If it shouldn't exist (for example, a redistricting leftover), should the committee be removed?

## What to do once answered

- If it has a weight: an Admin enters the per-seat value in the LTED weight editor (this also sets its seats),
  or the county sends an updated weighted table that includes it.
- If it shouldn't exist: decide how to remove or deactivate the committee. That is a separate change.

Evidence: `/Users/matan/Documents/voter-file-tool-snapshots/pr160-predeploy/postimport-output.txt` and
`committees-after.csv` (local snapshot, not in the repo).
