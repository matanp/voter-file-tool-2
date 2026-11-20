# 11 - Prod shows every date of birth one day early

Status: ready-for-agent
Tier: 1 (fix now) · Priority: P1
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding B1

Ship this on its own. It does not wait for the date-handling spec (ticket 10).

## Problem

`new Date(value).toLocaleDateString()` renders a date stored at UTC midnight in the browser's time zone, so any US
browser shows the day before. The same voter (same phone) reads 3/5/1972 locally and 3/4/1972 in prod. Local data is
mostly stored at Pacific midnight (`2003-05-26 07:00 UTC`), which hides the bug locally. A prod export
([02](02-measure-stored-drift.md)) had ~97% of DOBs at `T00:00Z`.

Call sites:

- `apps/frontend/src/app/recordsearch/fieldsConfig.tsx:210` (DOB)
- `apps/frontend/src/app/recordsearch/fieldsConfig.tsx:333` (originalRegDate)
- `apps/frontend/src/app/recordsearch/VoterCard.tsx:74` (DOB)

## Fix

Format these calendar dates in UTC: `toLocaleDateString('en-US', { timeZone: 'UTC' })`, through one small shared
helper so the next call site doesn't repeat the bug. Grep the rest of the app (committee rosters, drawers, XLSX/PDF
exports in `apps/report-server`) for other calendar-date fields formatted without a time zone, and fix any that render
a stored DOB or registration date.

The ~2.5% of rows stored at Pacific midnight still read correctly in UTC (07:00Z is the same calendar day), so this
fix is safe for them too. Correcting their stored values stays with the backfill in this folder.

## Acceptance criteria

- [x] With the browser in America/New_York, record search and the voter card show a DOB stored as
      `1972-03-05T00:00:00Z` as 3/5/1972.
- [x] Same for originalRegDate.
- [x] A unit test pins the helper's output under a non-UTC `TZ`.
- [x] Other calendar-date display sites found by the grep are fixed or listed here.

## Comments

### 2026-11-19: fixed on `fix/dob-one-day-early`

- `formatCalendarDateNumeric` in `apps/frontend/src/lib/dateUtils.ts` formats in UTC ("3/5/1972"). Used for DOB and
  originalRegDate in record search, DOB on the voter card, and two more sites with the same bug, both stored at UTC
  midnight from a `type="date"` input: `meetingDate` (`admin/meetings/MeetingsManagement.tsx`) and
  `petitionPrimaryDate` (`committees/CommitteeSelector.tsx`, the legacy page).
- `jest.globalSetup.cjs` runs the frontend suite in `America/New_York`. CI runs in UTC, which hid this. The whole
  suite already passed in that zone.

Found by the grep and not fixed here (details in [../inventory.md](../inventory.md)):

- **XLSX exports** write DOB and originalRegDate as ISO text, not shifted. Tracked in
  `.scratch/xlsx-export-formatting/issues/02`.
- **`apps/report-server/src/components/ChangesReport.tsx:11`** formats `YYYY-MM-DD` in the server's zone. Correct
  only while the report server runs in UTC.
- **DOB search** (single date and range) compares raw instants that carry the picker's local time of day. This is an
  input bug, not a display bug, and is likely `docs/BUGS.md` BUG-001.
- **`lib/electionDateUtils.ts` `formatElectionDate`** duplicates the numeric UTC format and returns `NaN/NaN/NaN` for
  invalid input. Folding it into `dateUtils.ts` is left to the Calendar Date module (ticket 06).

