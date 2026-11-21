# 09 - Capture exceptions and failed actions

Status: ready-for-agent

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
