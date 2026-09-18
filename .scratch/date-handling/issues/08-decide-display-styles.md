# 08 - Decide the display styles the module exposes

Type: prototype
Status: open
Blocked by: 06
Parent: ../map.md

## Question

What are the named ways a date is allowed to appear, and what does each look like?

Build the cheap concrete artifact first — every distinct date rendering currently in the repo, side by side, with the call sites that produce it. Then react to it. Known inputs: `formatElectionDate`'s short / long / withOrdinal, `formatCalendarDateForDisplay`'s "Jan 1, 2026", report-server's private ordinal copy at `utils.ts:35-66`, and 28 bare `toLocaleDateString` calls with no options at all.

Settle:

- The named styles, and which existing renderings collapse into which.
- What the designating petition PDF requires specifically — its wording is a legal artifact, not a display preference, and it is the reason report-server is in scope.
- Whether the "local timezone" branch in `formatElectionDate` has any caller, and if not, that it goes.
- Whether locale is fixed at `en-US` by decision rather than by accident.
