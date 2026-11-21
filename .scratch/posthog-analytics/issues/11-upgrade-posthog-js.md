# 11 - Upgrade posthog-js

Status: ready-for-agent

`apps/frontend/package.json` pins `posthog-js` at `1.203.1` (Dec 2024). Newer versions add the
`capture_exceptions` init option (09), better replay masking controls (06), dead-click capture, and the
`defaults` init option, which replaces the hand-rolled `$pageview` capture in `PostHogPageView.tsx` with history
tracking.

## Do

- Upgrade to the current release and read the changelog for breaking changes to `init` options.
- Consider `defaults: '<date>'` with `capture_pageview: 'history_change'`, and delete `PostHogPageView.tsx` if it
  becomes redundant. Check that pageview counts don't double.
- Keep the `/ingest` rewrites in `next.config.ts` working, including any new asset paths.
- Keep the in-progress `qa_agent` and identify-dedup behaviour in `PostHog.tsx` and its tests.

## Done when

The build passes, provider tests pass, and a local session shows one `$pageview` per navigation.
