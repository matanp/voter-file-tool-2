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
