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
