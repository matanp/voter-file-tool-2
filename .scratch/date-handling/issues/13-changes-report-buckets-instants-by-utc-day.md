# 13 - Changes report buckets instants by UTC day

Status: needs-triage
Source: [../inventory.md](../inventory.md) F9; PR #166 review

Out of this map's scope. This is an instant (an event's moment), not a calendar date. The map covers calendar dates
only.

## Problem

`apps/report-server/src/committeeMappingHelpers.ts:634` sets each row's `changeDate` to
`changeDate.toISOString().slice(0, 10)`, the UTC day of instants like `activatedAt`, `resignedAt`, `removedAt` and
`confirmedAt`. A change at 9pm Eastern on Mar 31 is listed under Apr 1. In a report for Mar 1 – Mar 31, that row
carries a date outside the report's own range.

Check whether the range filter for those instants (`fromInclusive`/`toExclusive`, UTC midnights) has the same
off-by-evening edge. A change late on Mar 31 Eastern may be dropped from the March report, or included in April's.

## Fix direction

Bucket and filter instants by their Eastern calendar day, with one helper that both the filter and the bucketing use.

## Acceptance criteria

- [ ] A change at 21:00 Eastern on Mar 31 appears under Mar 31 in the March report and not in April's.
- [ ] Tests pin both the bucketing and the range edges.
