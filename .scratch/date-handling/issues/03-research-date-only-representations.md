# 03 - Research: date-only representations available in this stack

Type: research
Status: claimed
Parent: ../map.md

## Question

What are the real options for representing a calendar date here, and what does each cost?

Cover:

- `Temporal.PlainDate` — its stage, native availability in the Node version this repo runs, and the polyfill situation under Next.js. Is it a 2026 option or still a bet?
- A branded `YYYY-MM-DD` string — what TypeScript branding costs at the zod and Prisma edges.
- A `Date` pinned to UTC midnight — what it takes to keep the invariant true, and what breaks when it isn't.
- What `date-fns` v3 (already a dependency) offers for date-only work, and whether it has a date-only type at all.
- How Prisma 5 maps `@db.Date` in the client: what TypeScript type comes back, and whether it round-trips without a timezone step.
- How each option survives JSON serialization across the frontend/report-server seam, since both apps consume the same values.

Findings go in a markdown file linked from this ticket. Decide nothing; ticket 04 decides.
