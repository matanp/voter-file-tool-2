# 02 - Toast may be cut off when focus moves (requests page)

Status: needs-triage

## Problem

On the Admin requests page (`/committees/requests`), after an Admin confirms or rejects a pending Exit Report:

- `ExitReportList.onDecided` shows a toast ("Confirmed the removal of X." / "Rejected the exit report for X.").
- About 150–200ms later, when the dialog's close animation ends, `PendingExitReportItem`'s `onCloseAutoFocus`
  moves focus to the "Pending requests" heading.

Radix Toast announces the toast through a short-lived `aria-live="assertive"` region (it's removed after about
1s and isn't re-read). NVDA and JAWS cancel ongoing speech when focus changes, so the user may hear
"Confirmed the removal of…" cut off by "Pending requests, heading level 1".

Code: `apps/frontend/src/app/committees/requests/ExitReportList.tsx` (`onDecided`),
`apps/frontend/src/app/committees/workspace/tabs/pending/PendingExitReportItem.tsx` (`onCloseAutoFocus`).

## First step

Test this with a real screen reader (NVDA on Windows, VoiceOver on macOS). jsdom can't show it. If the message
is cut off, the fix is a few lines: show the toast after focus has moved, e.g. call back from `onCloseAutoFocus`
after focusing, or defer the toast with `requestAnimationFrame`/`setTimeout`.

## Notes

- The workspace Pending tab doesn't have this problem: it announces through its own polite `role="status"`
  line. Polite updates queue behind focus speech instead of being cut off.
- The requests page may be folded into the workspace (`.scratch/committees-workspace/issues/22-requests-page-into-workspace.md`).
  If so, this goes away.
