# 20 - Name the Exit Report parameter

Status: ready-for-agent

## Problem

`reportedByText(r, canDecide)` uses `r` for a `PendingExitReport`. The abbreviated
name makes privacy-sensitive display logic harder to scan.

## Acceptance criteria

- [ ] Rename `r` to `report` (or an equally explicit name).
- [ ] The helper's behavior and tests remain unchanged.
