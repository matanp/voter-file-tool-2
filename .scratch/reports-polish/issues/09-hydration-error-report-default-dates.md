# 09 - Hydration error on /reports from time-zone-dependent default dates

Status: ready-for-human
Type: task
Source: Sentry [VOTER-FILE-TOOL-7B](https://matan-co.sentry.io/issues/VOTER-FILE-TOOL-7B) (triaged 2026-11-21)

## Problem

Sentry has a recurring React hydration error in production: 15 events since 2026-09-17, 9 of them on
`https://opensourcepolitics.online/reports`. The others were single events on `/admin/terms`,
`/admin/eligibility-flags`, `/` and one `/committees` roster URL.

Likely cause (not yet confirmed): `ScopedReportForm` (`apps/frontend/src/components/reports/ScopedReportForm.tsx`, a
client component that is still server-rendered) seeds its state from the current date:

- `useState(() => defaultScopedReportName(ui.defaultNamePrefix))`. The helper calls
  `new Date().toLocaleDateString("en-US", …)` in `components/reports/scopeReportFormSpecs.ts:86`.
- `const defaultRange = last30DaysIsoRange()` (`scopeReportFormSpecs.ts:98`) builds the from/to dates with
  `new Date()`, `setDate` and `toISOString`.

The Vercel server renders in UTC and the browser renders in the user's local time zone. Between 4pm and midnight
Pacific (00:00–08:00 UTC) the two are on different calendar days, so the server HTML and the first client render
disagree. The latest event, 2026-11-21 02:19 UTC (6:19pm Pacific on Nov 20), falls in that window.

Not yet confirmed: the attached replay records only "hydration error", not which text differed, and the single events
on the other pages may have a different cause.

## Fix

1. Confirm it: load `/reports` locally with the server in UTC (`TZ=UTC pnpm dev`) and the browser time zone set to a
   date where Pacific and UTC fall on different days (DevTools → Sensors → Location, or a system TZ override). Check
   the console for the hydration diff.
2. Make the first render identical on both sides. Either start the name and date range empty or neutral and fill them
   in a mount effect, or compute them on the server and pass them in as props so the client never recomputes them.
   Make sure a value the user has typed is never overwritten.
3. `last30DaysIsoRange` also mixes local `setDate` with UTC `toISOString`, which can shift the range by a day near
   midnight. Build the range in one time zone.
4. Check the other affected pages (`/admin/terms`, `/admin/eligibility-flags`, `/`) for similar date or locale
   rendering during server-side rendering. Split them into a separate ticket if they turn out unrelated.

## Acceptance

- `/reports` doesn't hydrate with a mismatch when the server and browser are on different calendar days (verified
  with the local repro above).
- The default report name and the 30-day range show the user's local date.
- Unit tests for the date helpers, including a time zone where UTC is on the next day.
- After deploy, Sentry 7B stops getting new events from `/reports`. Resolve it in Sentry once it's been quiet for a
  week.

## Comments

1. 2026-11-21 (agent): The hypothesis above was wrong. `ScopedReportForm` isn't on `/reports` (it's on the
   per-report pages), and its dates only seed controlled inputs. React applies the client value to those during
   hydration without an error or warning. A `hydrateRoot` test with the clock moved a day between the server and
   client renders confirms it.

   The real cause is `PendingJobsIndicator` on `/reports`. It's server-rendered with `initialJobs` and prints
   "Started Nov 21, 02:19 AM" as text, formatted in the runtime's default zone. The server (UTC) and any non-UTC
   browser disagree at every hour, not only in the evening window. It only shows up when the user has a pending,
   processing or failed report, which fits the low event count. A `hydrateRoot` test (server in UTC, client in
   Pacific) reproduces the production "Hydration failed because the server rendered HTML didn't match the client"
   against the old code.

   Fix: the start time is rendered only after hydration (`useHasMounted`). `last30DaysIsoRange` now builds the range
   from the local calendar day (step 3), and the date helpers take an optional `timeZone` for tests. The jest suite
   is pinned to New York, so `process.env.TZ` can't be switched per test.

   Step 4: the other pages are split out to `10-hydration-errors-other-pages.md`. The `/admin/eligibility-flags`
   date is fetched on the client, so it isn't the cause there.

   Not done: the manual `TZ=UTC pnpm dev` browser repro. The `hydrateRoot` test covers the same mismatch.

   Left for a human: after deploy, watch Sentry 7B for a week and resolve it if `/reports` stays quiet, then mark
   this `resolved`.
