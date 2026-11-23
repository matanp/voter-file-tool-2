# 06 - Mask voter PII in session replays

Status: resolved

## Problem

Session recording is on (`session_recording_opt_in: true`) with no masking config. Nothing in the frontend uses
`ph-no-capture` / `ph-mask` or sets `session_recording` options in `posthog.init`. posthog-js masks input values by
default, but not rendered text. So every replay of record search, committee rosters, voter cards and reports stores
voter names, addresses, DOBs and phone numbers in PostHog. Autocapture `$el_text` and `elements_chain` also pick up
on-screen text: street names show up in rage-click elements today.

## Decide

- How much voter data PostHog may hold, given the board-of-elections data agreement.
- Mask all text by default (`session_recording: { maskTextSelector: "*" }` or the current equivalent) and unmask
  layout chrome, or mask only voter-data containers (`ph-mask` on result tables, voter cards, rosters, report
  previews).
- Stop autocapture collecting element text inside voter-data containers (`ph-no-capture`, or
  `mask_all_element_attributes` / `mask_all_text`).
- Whether to delete existing recordings. Retention is 30 days, so they age out on their own.

## Done when

A replay of record search and of a committee roster shows no voter names or addresses, and autocapture events from
those pages carry no voter text.

## Comments

2026-11-21: Decision: mask all text now. Narrowing the masking to voter-data areas is ticket 13.

Done, in `posthog.init` (`components/providers/PostHog.tsx`):

- `session_recording: { maskAllInputs: true, maskTextSelector: "*", maskAttributeFn }`. Every text node and input
  is masked. `maskReadableAttribute` also masks text-bearing attributes (`aria-label`, `title`, `alt`,
  `placeholder`, `value`, …), because labels like "Remove MAIN ST" can name voters. Layout attributes (`class`,
  `style`, `href`, `data-*`) are kept so replays still render.
- `mask_all_text: true`, `mask_all_element_attributes: true`: autocapture no longer sends element text or
  attributes.
- The project's "Privacy and masking" setting now matches (`maskAllInputs`, `maskTextSelector: "*"`), so the SDK
  doesn't warn about a mismatch.
- Workspace URLs only carry `committee` / `tab` / `town` / `ld` ids, so pageview URLs hold no voter data.

Checked in local dev by recording real replays (Playwright with the automation flag hidden), decompressing the
`/ingest/s` and `/ingest/e` payloads in memory and searching them for words visible on the page. On
`/committees` and on `/recordsearch` with synthetic results (made-up voter names, phones, streets), no visible
text appeared in replay or event payloads; only URL paths, element ids and CSS did. Not checked on a real roster
with names, because the local data has no filled seats. Check one in production after deploy.

Existing recordings were not deleted. They age out by about 2026-12-21 (30-day retention). 02's replays will
still show text until then.

Still open: **console log capture is on** (`capture_console_log_opt_in`). Replays include console output, and
any `console.log`/`console.error` that prints a voter record would reach PostHog. Decide whether to turn it off
or audit what the app logs.

2026-11-22: Console logs are off in code: `enable_recording_console_log: false` in `PostHog.tsx` overrides the
project setting (posthog-js reads the client value first), so replays carry no console output. Asserted in
`PostHog.test.tsx`.
