# 14 - The date picker's month and day controls misbehave

Type: bug
Status: needs-triage
Parent: ../map.md

## What happens

`apps/frontend/src/components/ui/datePicker.tsx` (used by every Date of Birth and date-range search field) builds its value by mutating a copy of the current `Date`:

- **Day rollover** (from the PR #167 review). `onSelect` (~line 95) calls `setDate(day)` on the current value, and the month select (~line 122) calls `setMonth(month)`. With the 31st selected, switching to a shorter month such as February rolls over into March. With 29–31 Jan selected, February does the same.
- **The month select doesn't take** (seen in Chrome while verifying PR #167, local dev, 2026-11-19, America/Los_Angeles). In a fresh single-date picker, choosing December and then year 1960 gave **1 November 1960**. Choosing December again, by mouse or by keyboard (ArrowDown, Enter), left it at November. Changing the year worked. Not diagnosed. It may be the Radix `Select` inside the `Popover`, or the caption reading `date` while `month={date}` drives the calendar.

## Why it matters

A Leader searching a December birthday can't pick it directly. The picked day can also silently differ from the one clicked.

## Not in scope here

PR #167 fixed what the picker's value *means* (the picked local day, sent as UTC midnight). This ticket is about how the picker *builds* that value. Review candidate 5 in `../map.md` (deepen the DOB picker into one value module) is the natural home if this grows.
