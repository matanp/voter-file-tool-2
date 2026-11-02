# 20 - Name the Exit Report parameter

Status: resolved
Merge blocking: no

## Problem

`reportedByText(r, canDecide)` uses `r` for a `PendingExitReport`. The abbreviated
name makes privacy-sensitive display logic harder to scan.

## Acceptance criteria

- [x] Rename `r` to `report` (or an equally explicit name).
- [x] The helper's behavior and tests remain unchanged.
