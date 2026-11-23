# 11 - Upgrade posthog-js

Status: resolved

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

## Comments

2026-11-21: Done. Upgraded to `posthog-js` 1.447.3 (2026-11-06), the newest release at least two weeks old.

- `defaults: "2026-05-30"`, pinned, not `'latest'`. Besides history pageviews it stops rage clicks firing on text
  selection, which is probably the house-number triple-click from 03. It's one step short of `2026-06-25`, which
  changes replay network-body streaming; skipped until 06 settles what replays hold.
- `capture_pageview: { path: true, search: true }`. `PostHogPageView.tsx` is deleted. The old component also
  captured on query-string changes, so this keeps pageview counts comparable.
- The `qa_agent` tagging moved into `init`'s `loaded` callback. That runs before the automatic first pageview, so
  that pageview is tagged too.
- `next.config.ts`: added `/ingest/array/:path*` → assets host (the new SDK loads remote config from
  `/array/<token>/config.js`). Removed the `/ingest/decide` rule, which never matched because `/ingest/:path*`
  sat above it.
- `CSPostHogProvider` now types its props as `{ children }`. The new `PostHogProvider` props require
  `apiKey` or `client`.

Checked in local dev (Playwright, `?qa_agent=1`): remote config, extensions and `/flags` all load through the
proxy with 200s. Loading `/` then navigating client-side to `/recordsearch` and `/committees` produced exactly 3
`$pageview`s, and `qa_agent: true` is in session storage. Playwright's browser is flagged as a bot, so those
events were logged (`ph_debug`) but not sent. Real browsers aren't affected.

Fixed while checking 08: the new SDK posts to trailing-slash paths (`/ingest/e/`, `/ingest/i/v0/e/`,
`/ingest/s/`). Next.js 308-redirected them, and batches sent with beacon / keepalive were aborted after the
redirect. Only each page's first batch reached PostHog; `$autocapture`, `$web_vitals` and custom events were lost.
`next.config.ts` now sets `skipTrailingSlashRedirect: true`, as PostHog's Next.js guide recommends. All mid-session
sends then return 200 and the events show up in PostHog. Side effect: app URLs with a trailing slash
(`/recordsearch/`) now render directly instead of redirecting to the slash-less URL.
