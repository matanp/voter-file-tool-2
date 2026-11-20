# Inventory: calendar dates vs instants

Answers [ticket 01](issues/01-inventory-calendar-dates-vs-instants.md). Swept 2026-11-19 against `origin/main` at
`1652239d`, plus the ticket 11 fix on branch `fix/dob-one-day-early`.

Scope of the sweep: every `DateTime` column in `apps/frontend/prisma/schema.prisma`, the write path for each
calendar-date column, and every non-test, non-prototype site that formats a date (`toLocaleDateString`,
`toLocaleString`, `Intl.DateTimeFormat`, date-fns `format`, local getters and setters). It does **not** classify each of
the ~144 `new Date(` constructor sites one by one. Most of those are `new Date()` "now" stamps or instant parsing; the
calendar-date ones are covered below through their columns.

## Columns

**Calendar dates.** These name a day, and the time part means nothing.

| Column | How it's written today | Stored at |
|---|---|---|
| `VoterRecord.DOB`, `.originalRegDate`, `.lastUpdate` (and `VoterRecordArchive`) | `packages/voter-import-processor/src/voterRecordProcessor.ts:168`, `new Date(yyyy, mm - 1, dd)` | **Midnight in the importing machine's time zone.** UTC midnight on prod (~97%), Pacific midnight for imports run from a Pacific machine (~2.5%, see ticket 02) |
| `ElectionDate.date` | `api/admin/electionDates/route.ts` and `/bulk`, using `parseCalendarDate` from `lib/electionConfigParsing.ts` | UTC midnight |
| `CommitteeTerm.startDate`, `.endDate` | `parseTermDateRange` → `parseCalendarDate` from `lib/dateUtils.ts:10` | **Noon** UTC |
| `MeetingRecord.meetingDate` | `api/admin/meetings/route.ts:35`, `new Date("YYYY-MM-DD")` from a `type="date"` input | UTC midnight |
| `CommitteeMembership.petitionPrimaryDate` | `api/admin/petition-outcomes/record/route.ts:128`, `new Date(primaryDate)` from a `type="date"` input | UTC midnight |
| `CommitteeMembership.resignationDateReceived` | `api/committee/remove/route.ts:166`, `new Date(str)`; the exit-report path copies the reported value | UTC midnight (if the client sends `YYYY-MM-DD`) |
| `VotingHistoryRecord.date` | No writer found in the repo | — |

**Instants.** Everything else: `createdAt`, `updatedAt`, `expires*`, `usedAt`, `deletedAt`, `submittedAt`,
`confirmedAt`, `activatedAt`, `resignedAt`, `removedAt`, `rejectedAt`, `exitReportedAt`, `reviewedAt`, `resolvedAt`,
`petitionOutcomeRecordedAt`, `AuditLog.timestamp`, `Report.requestedAt`, `Report.completedAt`. All of them are
`new Date()` at the moment of the event.

Two functions are both named `parseCalendarDate` and use different conventions: noon UTC in `lib/dateUtils.ts` and UTC
midnight in `lib/electionConfigParsing.ts`. So the repo has three live write conventions (UTC midnight, noon UTC, local
midnight of the importer), plus the picker's local time described below.

## Findings

Ranked by impact. "Fixed" means fixed on `fix/dob-one-day-early` (ticket 11).

| # | Where | What goes wrong | Status |
|---|---|---|---|
| F1 | `recordsearch/fieldsConfig.tsx` (DOB, originalRegDate), `recordsearch/VoterCard.tsx` (DOB) | UTC-midnight date formatted in the browser's zone, so it shows a day early in the US | Fixed |
| F2 | `admin/meetings/MeetingsManagement.tsx:76` (meetingDate) | Same as F1 | Fixed |
| F3 | `committees/CommitteeSelector.tsx:1098` (petitionPrimaryDate, legacy page) | Same as F1 | Fixed |
| F4 | **DOB search, single date**: `components/ui/datePicker.tsx:95` → `lib/searchFieldProcessor.ts:722` → `shared-validators/src/searchQueryUtils.ts:181` | The picker builds the date from `new Date()` and only changes the day, so `singleDate` carries the current local time of day. The server then matches `DOB in [that exact instant]`, which no row stored at midnight can equal. This is very likely the cause of `docs/BUGS.md` **BUG-001, "Single date search not working"**. Read from the code; not yet reproduced in the app | Open → new ticket |
| F5 | **DOB search, range and extend-before/after**: same path, `gte`/`lte` on the raw instants | Start and end carry local time of day, so the start day is dropped (`gte 1972-03-05T14:23Z` excludes `00:00Z`), and the end day is kept only by accident. Ticket 07 (inclusive-end rule) is the design question; this is the live bug | Open → new ticket, with ticket 07 |
| F6 | Voter import, `voterRecordProcessor.ts:168` | The stored date depends on the importing machine's time zone. A run from a machine east of UTC would store the **previous** day, and then no reader can recover the true day | Open → new ticket (A+ step 3), plus a backfill of the ~2.5% |
| F7 | `report-server/src/components/ChangesReport.tsx:11` | `formatDate("YYYY-MM-DD")` parses UTC midnight and then formats in the server's local zone. Correct only while the report server runs in UTC | Latent; fix with `timeZone: 'UTC'` |
| F8 | XLSX exports (DOB, originalRegDate) | Written as ISO text cells, not dates. The day isn't shifted (the first 10 characters are right) | Already tracked: `.scratch/xlsx-export-formatting/issues/02` |
| F9 | Changes report buckets instants by UTC day (`committeeMappingHelpers.ts:634`, `toISOString().slice(0, 10)`) | An activation at 9pm Eastern is listed under the next day | Instant, not calendar date; out of this map's scope, but worth a ticket |

## Sites checked and fine

- New workspace code already formats calendar dates in UTC through `formatCalendarDateForDisplay`:
  `PendingExitReportItem.tsx:188`, `useMeetingOptions.ts:46`, `historyModel.ts:85` and `:211`, `TermsManagement.tsx:277`.
- `lib/electionDateUtils.ts` defaults to UTC. No caller passes `timeZone: "local"`.
- Report-server: `utils.ts:61` (UTC), `signInSheetHelpers.ts:229` (UTC calendar formatter), and the "generated on"
  stamps, which are instants and are the Clock problem that the map rules out of scope.
- `lib/searchFieldProcessor.ts:129` formats the picker's own local `Date` in local time, which is consistent. This
  becomes a problem only if F4 is fixed by changing the picker's representation.
- `electionConfigParsing.ts:110` (`calendarDateFromLocalDate`) reads local parts from a picker date on purpose.
- Instant displays (`createdAt`, `submittedAt`, `timestamp`, `lastImported`, invites) use local time, which is
  correct for instants.

## What this means for the rest of the map

- The display half (F1–F3, F7) is mechanical once one formatter exists. A lint rule on `toLocaleDateString` without a
  `timeZone` would have caught every case (ticket 09).
- The two real bugs that remain are on the **input** side (F4–F6). Both come from building a calendar date out of a
  local `Date`. That supports giving the Calendar Date module (ticket 06) its own parse and construct functions, not
  just a formatter.
