# 02 - Export Date of Birth and Original Registration Date as dates, not ISO timestamps

Status: needs-triage
Type: task

## Found

2026-11-08, in the same production voter-list export as ticket 01 (17,223 rows). Date of Birth and Original
Registration Date come out as text cells holding a UTC timestamp, like `1985-03-14T00:00:00.000Z` (the cell type is
`s`). Excel can't sort, filter or format them as dates, and the time part means nothing to the reader.

The time of day stored with these dates isn't consistent:

| Time part | Date of Birth | Original Registration Date |
| --- | --- | --- |
| `T00:00:00.000Z` (UTC midnight) | 16,790 | 16,790 |
| `T08:00:00.000Z` (Pacific midnight, standard time) | 255 | 155 |
| `T07:00:00.000Z` (Pacific midnight, daylight time) | 177 | 278 |
| `T07:52:58.000Z` | 1 | 0 |

`-07:52:58` is Los Angeles's pre-1883 local mean time offset, so that one DOB is probably a very old placeholder date
that was parsed in Pacific time. That's a guess; I haven't looked at the row.

In every pattern, the first 10 characters (`YYYY-MM-DD`) are the right calendar date. Formatting the instant in a US
time zone would not be: the 16,790 UTC-midnight rows would show **the day before**.

## Why

`convertPrismaVoterRecordToAPI` (`packages/shared-validators/src/compoundFieldUtils.ts`) turns `DOB`, `lastUpdate` and
`originalRegDate` into `toISOString()` strings. `extractFieldValue` passes them through unchanged, and
`XLSX.utils.aoa_to_sheet` writes them as text. The voter-list and committee XLSX exports both go through
`generateUnifiedXLSXAndUpload`, so both are affected.

These two fields are **Calendar Dates**, not **Instants** (see §Time in `apps/frontend/CONTEXT.md`). The mixed time
parts above are the stored drift that `.scratch/date-handling/issues/02-measure-stored-drift.md` is trying to measure.

## Fix

- In the XLSX path, write each Calendar Date field as its UTC calendar date. Take the `YYYY-MM-DD` part, or the
  `getUTC*` parts, and never format it in local time.
- Preferred: real Excel date cells with the number format `yyyy-mm-dd`, so Excel can sort and filter them. Build the
  serial number from the UTC year/month/day, not from a JS `Date` handed to SheetJS, which would apply the server's
  time zone.
- Fallback: `YYYY-MM-DD` text.

How this relates to the date-handling effort (`.scratch/date-handling/map.md`): this change only touches the output,
so it can ship before that spec. When the Calendar Date module lands, it should switch to that module's formatter.

## Acceptance

- In a voter-list export with DOB and Original Registration Date selected, both columns hold dates (or `YYYY-MM-DD`
  text, if that's the decision), with no time part.
- For rows stored at UTC midnight and rows stored at Pacific midnight, the export shows the same calendar date as the
  stored `YYYY-MM-DD` prefix.
- A report-server test covers a UTC-midnight value, a `T07:00Z` value and a `T08:00Z` value, and passes when run under
  `TZ=America/New_York` as well as UTC.
