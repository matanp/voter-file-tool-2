# 01 - Inventory the calendar dates and the instants

Type: task
Status: open
Parent: ../map.md

## Question

Which values in this repo are calendar dates, and which are instants? Nothing downstream can be decided without the list.

Produce, as a committed artifact under `.scratch/date-handling/`:

- Every Prisma column that holds a date, classified calendar-date or instant, with the reasoning for anything ambiguous.
- Every non-test call site that constructs, parses, formats or compares one of those values, classified the same way. The starting count is 126 `new Date(` sites across 61 files, plus 28 `toLocaleDateString` sites.
- For each calendar-date column, which code paths write it, and which midnight convention that path uses today. Four are known: noon UTC (`lib/dateUtils.ts:22`), UTC midnight (`api/admin/electionDates/route.ts:41`), local midnight (`voterRecordProcessor.ts:168`), local midnight (the picker).

This is the fact base for the representation and persistence decisions. It decides nothing itself.
