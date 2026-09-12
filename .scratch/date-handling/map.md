# Date handling

Label: wayfinder:map

## Destination

A spec at `.scratch/date-handling/spec.md` that an implementing agent can execute without making any further decisions: the Calendar Date module's seam and interface, which columns and call sites migrate, what happens to existing rows, and the skill plus lint rule that stops a fifth convention appearing.

## Notes

- Domain: county committee membership tracked against the voter file. Glossary lives at `apps/frontend/CONTEXT.md` (covers the whole repo, despite its location).
- Skills every session should consult: `codebase-design` for the architecture vocabulary, `domain-modeling` to keep §Time in CONTEXT.md current, `grilling` for the HITL tickets.
- **Planning only.** This map produces decisions and a spec. The only work it performs is `task` tickets that unblock a decision — inventories and measurements, not migrations.
- Origin: architecture review of date handling, 2026-08-29. Its candidates 1, 2, 3 and 6 are this effort; 4 and 5 are ruled out below.

## Decisions so far

- Charting, Q1: the destination is a spec to hand off, not the change made in place.
- Charting, Q2: scope is the calendar-date thread — the module, the range filter, the display module, and the skill/lint rule.
- Charting, Q3: migration is bounded to sites that carry a calendar date. Instant sites (`createdAt`, `timestamp`, `submittedAt`) are left alone.
- Charting, Q4: `apps/report-server` is in scope alongside `apps/frontend` — two adapters make the seam in `shared-validators` real.
- Charting: **Calendar Date** and **Instant** named in §Time of `apps/frontend/CONTEXT.md`. The distinction is settled; which type represents a Calendar Date is not (ticket 04).
- Charting, Q4: the convention is held by a skill plus a lint rule scoped to calendar-date paths, not an app-wide ban on `new Date(`.

## Not yet specified

- How the Date of Birth search's extend-before / extend-after boundaries express themselves once the representation is chosen. `DATE_BOUNDARIES` currently holds two `Date` objects, one of them computed at module load.
- Whether `calendarDateStringSchema` (`schemas/committeeTerm.ts`) and the report schemas' `z.string().datetime()` converge on one shared zod schema, or stay separate because one describes a calendar date and the other an instant.
- What the invalid-date policy is across the module — today `formatCalendarDateForDisplay` returns `""` and `sortElectionDates` sorts invalid dates last, and nothing states which is intended.
- Whether the voter import processor's change of convention implies a re-import of already-loaded voter files rather than a backfill.

## Out of scope

- **Put "now" behind a Clock seam** (review candidate 4): `LATEST_DATE` frozen at module load, six "generated on" stamps in report-server. A clock problem, not a calendar-date problem — different value, different seam. Its own effort.
- **Deepen the Date of Birth picker into one value module** (review candidate 5): mode transitions and extend toggles spread across five modules with state in refs. A React state-shape problem that would still be worth doing if every date in the repo were already correct. Its own effort.
