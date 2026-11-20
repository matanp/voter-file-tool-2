# 05 - Decide the persistence shape, and what happens to existing rows

Type: grilling
Status: open
Blocked by: 02, 04
Parent: ../map.md

## Question

Do the calendar-date columns stay `DateTime` with a UTC-midnight invariant, or become `@db.Date`?

The trade the map has already framed: with `@db.Date` the database enforces the invariant and the module mostly formats; with `DateTime` the module is the only thing standing between the repo and a fifth convention. The cost is a migration on `VoterRecord.DOB`, sized by ticket 02.

Settle with it:

- Whether the existing drifted rows are corrected, and by what — a backfill migration, a re-import, or nothing.
- Whether correction ships with the schema change or separately.
- If the numbers from ticket 02 make the backfill its own project, rule it out to the map's Out of scope rather than carrying it.

This is the hard-to-reverse decision in the effort and the one a future reader will ask "why" about. Offer an ADR under `docs/adr/` when it resolves — the directory does not exist yet, so create it.

## Comments

### 2026-11-19: the drifted rows are already corrected

The first two bullets above are settled, outside this ticket. The drifted voter rows were fixed by an in-place
backfill (PR #165, `pnpm db:backfill-voter-dates-utc`), shipped separately from any schema change. Every voter
calendar date on prod is now at UTC midnight. Ticket 02 has the counts.

What's left here is the schema question: keep `DateTime` with the UTC-midnight invariant, or migrate to `@db.Date`.
Size of a `@db.Date` migration: 539,425 rows in `VoterRecord` and 3,548,414 in `VoterRecordArchive`, three columns
each. The data is already clean, so the migration is a plain type cast with no correction step.
