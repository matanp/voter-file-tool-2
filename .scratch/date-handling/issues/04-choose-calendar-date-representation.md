# 04 - Choose the Calendar Date representation

Type: grilling
Status: open
Blocked by: 01, 03
Parent: ../map.md

## Question

What type does a Calendar Date have in this codebase?

The candidates are a branded `YYYY-MM-DD` string, a `Date` pinned to UTC midnight, and `Temporal.PlainDate` — narrowed by whatever ticket 03 reports.

Settle with it:

- What crosses the wire between the two apps, and what a zod schema for it looks like.
- What a picker hands back, and what a Prisma write takes.
- Whether the type makes the illegal state unrepresentable, or merely conventional. A branded string can; a `Date` can only ever hold an invariant by agreement.

The answer names the term the rest of the map uses, so add it to §Time in `apps/frontend/CONTEXT.md` alongside Committee Term when it lands.
