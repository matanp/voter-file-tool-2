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
