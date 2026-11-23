# 14 - Admin upload pages overflow horizontally

Status: ready-for-agent

Part of [ui-makeover](../spec.md).

## Problem

`/admin/absentee-report` and `/admin/voter-import` are wider than the screen at both 375 (423px) and 1280 (1584px), as measured by the `run-frontend` driver's overflow check. The likely cause, not yet confirmed in a browser, is the `sr-only` file input in `PresignedUploadReportForm.tsx:152` having no positioned ancestor. `/admin/weighted-table` may share it.

## Proposal

Confirm the cause in a browser, then add `relative` to the form or card wrapper. Don't paper over it with `overflow-x-hidden` on the layout unless the cause turns out to be elsewhere.

## Acceptance

- The `run-frontend` driver reports no `OVERFLOW` for these pages at 375/768/1280.
- A regression check is added if one is cheap.

Evidence: reviews/admin.md §2 (first row).

## Comments

### 2026-11-21 - triage

Ready for agent. A standalone bug with no blockers, so it can start immediately.
