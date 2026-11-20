# 07 - Decide the date-range rule and where its seam sits

Type: grilling
Status: open
Blocked by: 06
Parent: ../map.md

## Question

What does a calendar-date range mean, and which module turns one into a Prisma filter?

Two builders exist today and they disagree. `buildAuditWhere.ts:16-25` snaps the end to 23:59:59.999. `searchQueryUtils.ts:137-158` passes the picker's instant straight to `lte`, which drops voter records born on the start date whenever the range is built west of UTC.

Settle:

- Whether a range's end is inclusive, and whether that is even a question once the representation from ticket 04 is in hand.
- Whether one module serves both the audit filter and the voter search, given that one filters instants and the other calendar dates. They may want the same rule and different entry points.
- Where the Date of Birth extend-before / extend-after boundaries live, and whether `DATE_BOUNDARIES` survives at all.
- Whether the off-by-one is a bug worth fixing ahead of the spec, or lands with it.

## Comments

### 2026-11-19: decided for voter search while fixing BUG-001

Settled for the voter search only (findings F4/F5 in `../inventory.md`):

- **A range includes both of its end days.** The query is half-open on UTC days: `gte` the start day's 00:00Z, `lt` the day after the end day's 00:00Z. A single date is a one-day range: `gte` its day, `lt` the next. `23:59:59.999` is not used.
- **The UTC day is the match unit**, because every stored voter-record date lies inside its correct UTC day, whether stored at UTC midnight (~97% in prod) or at Pacific midnight (07:00/08:00Z, plus one at 07:52:58Z).
- **Seam:** `buildPrismaWhereClause` (`shared-validators/src/searchQueryUtils.ts`) snaps every `DATE_FIELDS` value and range bound to its UTC day, so record search and report-server exports agree. The browser sends the day the user picked as UTC midnight (`pickedDayToUtcIso` in `apps/frontend/src/lib/dateUtils.ts`), since only the browser knows the local day.
- Reproduced on the local DB (all rows at Pacific midnight) with 12 Dec 1960 picked at 19:42 PST: single date, before 0 / after 36 of 36; one-day range, 0 → 36; 10–12 Dec, 65 → 77 of 77. Before the fix the start day was dropped.

Still open here: whether `buildAuditWhere.ts` (instants) moves to the same rule, and what happens to `DATE_BOUNDARIES`. `EARLIEST_DATE`/`LATEST_DATE` still go over the wire raw and are snapped server-side.
