# 06 - Mask voter PII in session replays

Status: needs-triage

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
