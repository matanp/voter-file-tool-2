# 09 - Capture exceptions and failed actions

Status: resolved

## Problem

No `$exception` events have ever been captured. Exception autocapture is off for the project
(`autocapture_exceptions_opt_in: null`), and the frontend doesn't call `captureException`. Two recent Admin replays
show console errors (see 02) that are invisible to analytics. Failed server actions show the user an
`OutcomeAlert`, but nothing is recorded.

## Do

- Turn on exception autocapture: the project setting, plus `capture_exceptions: true` in `posthog.init` if the SDK
  version supports it (see 11).
- In the Next.js `error.tsx` / `global-error.tsx` boundaries, call `posthog.captureException(error)`.
- In `useActionSubmit` (or wherever action failures are normalized), capture `action_failed` with `action`,
  `error_code` and `http_status`. Leave out the message if it can contain voter data.
- Optional: upload source maps so stack traces are readable.

## Done when

A forced client error in local dev shows up in PostHog Error Tracking, and a rejected add-member shows an
`action_failed` event.

## Comments

2026-11-21: Done.

- Project setting `autocapture_exceptions_opt_in` is on, and `posthog.init` has `capture_exceptions: true`.
- `app/error.tsx` (the only boundary; there's no `global-error.tsx`) calls `posthog.captureException(error,
  { boundary: "app/error" })` next to the existing Sentry call.
- `lib/analytics.ts` adds the typed `track()` wrapper that 08 extends. `action_failed` is recorded in the
  committee workspace's `postJson`, not in `useActionSubmit`: `postJson` is where every drawer mutation (add,
  request, remove, resign, exit reports) passes through and where the HTTP status is known. Properties:
  `action` (`committee/add`…), `error_code` (`INELIGIBLE`, another all-caps server code, `http_<status>`, or
  `network_error`), `http_status`, and `reasons` (hard-stop codes) for ineligible. Free-text server messages are
  never sent.
- Tests: `__tests__/lib/analytics.test.ts`, plus an "action_failed analytics" block in
  `__tests__/app/committees/workspace/adapters.test.ts` covering a rejected add, a free-text 404, a network
  failure and success.

Checked in local dev: forcing an uncaught error loads `exception-autocapture.js` and produces a `$exception`
event. Playwright's bot user agent stopped it being sent, so it isn't in Error Tracking yet; check after deploy.

Not covered: failures outside the committee workspace (reports, admin, petitions) and source-map upload.
`$exception` events carry the error message, which in rare cases could quote voter data.
