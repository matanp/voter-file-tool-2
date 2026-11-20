# 02 - Measure the drift in stored rows

Type: task
Status: open
Blocked by: 01
Parent: ../map.md

## Question

How much existing data is already wrong, and where?

For each calendar-date column identified in ticket 01, find:

- Total row count.
- How many rows sit at an instant other than UTC midnight, grouped by the offset they sit at (the offset identifies the writing path).
- Whether any row's calendar day differs depending on whether it is read in UTC or in `America/New_York`.

`VoterRecord.DOB` is the one that matters for size — it is the largest table in the repo, and its row count is what makes the `@db.Date` migration in ticket 05 either routine or a project of its own.

If the database is not reachable from this session, say so and hand back the exact queries for a human to run. Record the numbers as the answer either way.

## Comments

### 2026-11-08: a data point from a production export

A production voter-list export of 17,223 rows (all fields, checked for `.scratch/xlsx-export-formatting/issues/02`)
had these time parts in `VoterRecord` dates. Most rows are UTC midnight, but about 2.5% are Pacific midnight:
- **`DOB`:** 16,790 `T00:00:00.000Z`, 255 `T08:00:00.000Z`, 177 `T07:00:00.000Z`, and 1 `T07:52:58.000Z` (LA's pre-1883
  local mean time offset).
- **`originalRegDate`:** 16,790 `T00:00:00.000Z`, 155 `T08:00:00.000Z`, 278 `T07:00:00.000Z`.

That's one export's slice, not a full-table measurement.

### 2026-11-19: full prod measurement of the voter dates, and the backfill

Measured on prod (Neon `ep-raspy-truth`) with the dry run of `pnpm db:backfill-voter-dates-utc` (PR #165), before
the backfill:

| Table | Non-null rows per column | At `00:00Z` | `07:00Z` | `08:00Z` | `07:52:58Z` | Other | Rows off |
|---|---|---|---|---|---|---|---|
| `VoterRecord.DOB` | 539,425 | 521,980 | 8,380 | 9,039 | 26 | 0 | |
| `VoterRecord.originalRegDate` | 539,425 | 521,980 | 12,048 | 5,397 | 0 | 0 | |
| `VoterRecord.lastUpdate` | 539,425 | 521,980 | 6,585 | 10,860 | 0 | 0 | |
| **`VoterRecord`** | | | | | | | **17,445 (3.2%)** |
| `VoterRecordArchive.DOB` | 3,548,414 | 3,047,744 | 250,587 | 249,724 | 359 | 0 | |
| `VoterRecordArchive.originalRegDate` | 3,548,414 | 3,047,744 | 359,359 | 141,311 | 0 | 0 | |
| `VoterRecordArchive.lastUpdate` | 3,548,414 | 3,047,744 | 157,336 | 343,334 | 0 | 0 | |
| **`VoterRecordArchive`** | | | | | | | **500,670 (14.1%)** |

What the numbers say:

- **Only one writing path drifted:** an import run from a Pacific machine. It wrote 07:00 (PDT), 08:00 (PST), and
  07:52:58 (LA local mean time) for pre-1883 dates. No row was at any other offset, so no import ever ran from a zone
  east of UTC.
- **The off rows are the same rows in every column,** because the `00:00Z` count is identical across all three. That
  fits one whole voter file imported from that machine: the archive's 500,670 matches a full file, and the local dev
  DB has 495,049 voters, all at Pacific midnight. The 17,445 live rows are the voters whose newest version still came
  from that file.
- **UTC vs `America/New_York`:**
  - Every Pacific-midnight value was on the correct calendar day when read in UTC.
  - Every value read in New York shows the day before: a `00:00Z` value is the previous evening there, and so is a
    07:00Z or 08:00Z one.
  - So the stored data was never wrong. Only displays that used the local zone were, and #162 fixed those.
- **For ticket 05 (`@db.Date`):** the migration is sized by these counts, 539,425 rows in `VoterRecord` and 3.55M in
  `VoterRecordArchive`.

**Fixed on 2026-11-19.**

- **Code (PR #165, merged as `ef0bc071`):** the import now writes `Date.UTC` (inventory F6). The report server was
  redeployed, and its compiled processor uses `Date.UTC`.
- **Backfill:** `pnpm db:backfill-voter-dates-utc --apply` rewrote 17,445 `VoterRecord` and 500,670
  `VoterRecordArchive` rows. The rerun dry run showed every value in both tables at `00:00:00.000`. `VACUUM ANALYZE` on
  both tables then removed 499,358 and 84,788 dead row versions.
- **Invariant now:** every voter calendar date is at UTC midnight.

**Still not measured:** the other calendar-date columns from ticket 01 (`ElectionDate.date`, `CommitteeTerm.*`,
`MeetingRecord.meetingDate`, `CommitteeMembership.petitionPrimaryDate` and `.resignationDateReceived`). Their writers
don't depend on the machine's time zone (see the inventory), so they're expected to be consistent. They aren't
counted here.
