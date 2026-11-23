# 03 - The results table's "See more details" column is clipped at 768px

Status: ready-for-agent

## Problem

At 768px, which is `md` (the first width with the table rather than the phone cards), the record search
table's last column, the "See more details" button, is cut off at the right edge. Opening details then
scrolls the table sideways. It was the same on `main` before PR #151, which left `md`+ alone. The baseline
and after screenshots under ticket 06 of `.scratch/leader-feedback-2026-11-11/` show it.

The table is `max-w-[80vw] table-fixed` (`src/app/recordsearch/VoterRecordTable.tsx:63`) inside `md:m-10`
(`RecordsList.tsx:215`). Its columns are fixed `ch` widths: Name `w-[24ch]` plus each searched field's `size`
from `fieldsConfig.tsx` (DOB 20ch, phone 18ch, ...). At 768 those widths leave the button column too little
room.

## Fix ideas

- Use the compact `⋯` details button (`compactView`) below `lg`.
- Or show the cards up to `lg` instead of `md`, if tablets read better as cards.
- Or let the field columns shrink below `lg`.

## Acceptance criteria

- [ ] At 768 and 1024 with the default results (Name, DOB, phone) the details control is fully visible and
      the table doesn't scroll sideways. Check it with the run-frontend skill's
      `steps/record-search-synthetic.mjs` (made-up voters).
- [ ] 1280 looks the same as before.

## Comments

### 2026-11-21 — UI makeover review

[ui-makeover/09](../../ui-makeover/issues/09-record-search-list-detail.md) proposes replacing the results table with two-line rows and a detail pane, which removes the details column entirely. Coordinate before fixing this in place.

### 2026-11-21

ui-makeover/09 (record search results as a dense list with a detail pane) replaces this ticket's visual parts. Don't build them separately. 09 must keep this ticket's accessibility requirements; if 09 is dropped, this ticket stands again.
