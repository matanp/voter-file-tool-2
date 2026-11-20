# 01 - A missing first or last name shows as "null" in record search

Status: ready-for-agent

## Problem

`VoterRecord.firstName` and `lastName` are both `String?` (`apps/frontend/prisma/schema.prisma`). Record search
builds the name with a template string, so a voter with no first name shows as `null SMITH` (and no last
name as `JOHN null`). It happens in three places:

- `src/app/recordsearch/VoterRecordTable.tsx:88`: the table's Name cell (on `main` before PR #151 too).
- `src/app/recordsearch/VoterRecordCardList.tsx:55`: the phone result card (copied from the table in #151).
- `src/app/recordsearch/VoterCard.tsx:43`: the details card's heading.

Found in the blind review of PR #151.

## Fix

Use `getName()` from `src/lib/voterRecordFormatters.ts`, which already drops null and empty parts. It also
adds the middle initial. Decide whether the results list should show it. If not, add a first/last-only
variant next to `getName()` rather than a fourth inline template.

## Acceptance criteria

- [ ] A record with `firstName: null` shows just the last name in the table, on the card and in the details
      card, with no `null` and no leading space. Same for `lastName: null`.
- [ ] One formatter serves all three places.
- [ ] Tests cover a null first name and a null last name.
