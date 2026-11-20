# 04 - Share the Exit Report decision wording

Status: needs-triage

## Problem

The success message after an Exit Report decision is written in two places:

- `apps/frontend/src/app/committees/workspace/tabs/PendingTab.tsx` (`onExitReportDecided`, the status line).
- `apps/frontend/src/app/committees/requests/ExitReportList.tsx` (`onDecided`, the toast).

Both say "Confirmed the {resignation|removal} of X." / "Rejected the exit report for X." today, but they can
drift apart.

## Fix

Move the wording into one helper, e.g. next to `personName` in `tabs/pending/PendingSubmissionItem.tsx` or in
`PendingExitReportItem.tsx`, and use it in both. This is a small cleanup, not an accessibility defect. It's filed
here because both strings are what screen readers announce.
