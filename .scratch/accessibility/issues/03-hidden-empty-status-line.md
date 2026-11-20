# 03 - Hidden empty status line may not announce (workspace Pending tab)

Status: needs-triage

## Problem

The Pending tab's status line, `<p role="status" className="... empty:hidden ...">` in
`apps/frontend/src/app/committees/workspace/tabs/PendingTab.tsx`, is `display: none` while it's empty. Some
browser and screen-reader pairs don't reliably announce text added to a live region that wasn't in the
accessibility tree beforehand. So the first outcome on a freshly opened tab could go unannounced.

This matters more since commit `6d64703`. Focus after an Exit Report decision now goes to the "Reported exits"
heading instead of the status line. Before, focusing the line made sure it was read; now the live region is the
only thing announcing the result. Accept/reject of member submissions has always relied on this same line, so
the pattern isn't new.

## Fix

Keep the region in the accessibility tree while it's empty, but hidden visually. For example, swap
`empty:hidden` for an `sr-only` style while it's empty, or render it always with no visible height. This is
likely about a one-line change. Check it with a screen reader, ideally NVDA plus Firefox or Chrome, and
VoiceOver plus Safari.

The same check probably applies to other `role="status"` lines in the app that hide themselves while empty.
Search for `empty:hidden` alongside `role="status"` / `aria-live`.
