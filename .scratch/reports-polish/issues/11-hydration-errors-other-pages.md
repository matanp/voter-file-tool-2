# 11 - Hydration errors on /admin/terms, /admin/eligibility-flags, / and /committees

Status: needs-triage
Type: task
Source: Sentry [VOTER-FILE-TOOL-7B](https://matan-co.sentry.io/issues/VOTER-FILE-TOOL-7B), split out of
[09](09-hydration-error-report-default-dates.md)

## Problem

Besides the `/reports` events fixed in 09, Sentry 7B had one hydration error each on `/admin/terms`,
`/admin/eligibility-flags`, `/` and one `/committees` roster URL (2026-09-17 to 2026-11-21).

Nothing obvious turned up:

- `/admin/eligibility-flags`: `EligibilityFlagsTable` formats `createdAt` with `toLocaleDateString()`, but the flags
  start empty and are fetched on the client, so the date is never in the server HTML.
- `/admin/terms`: `TermsManagement` uses the calendar-date helpers (`formatCalendarDateForDisplay`), which look
  time-zone safe.

Single events across unrelated pages could come from something they share (layout, nav, providers), or from a
browser extension changing the DOM before hydration. Extensions are a common source of one-off hydration errors.

## Fix

1. Once 09 ships, check whether 7B keeps getting events from these pages. If it doesn't, close this.
2. If it does, open the events' replays or breadcrumbs for the browser and any extension hints, and look in the
   shared layout for server-rendered output that depends on the clock, time zone, locale or `window`.
3. PR #187 (session on first paint) changes the shared layout's server HTML on every page: the nav and acting role
   now come from the server session. Once it ships, recheck 7B on these pages as well. #187 notes that a Developer
   whose cached acting role (localStorage) is lower still gets one change after hydration.

## Acceptance

- Either a cause is found and fixed, or the events are attributed to extensions and filtered in Sentry.

## Comments
