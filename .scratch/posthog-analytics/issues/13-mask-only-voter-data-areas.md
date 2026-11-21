# 13 - Narrow replay masking to voter-data areas

Status: needs-triage

Follow-up to 06. Since 2026-11-21, replays mask **all** text and readable attributes, and autocapture sends no
element text or attributes. That keeps voter data out of PostHog, but it makes replays and rage-click analysis
harder: buttons show as `*****`, and `$rageclick` / `$autocapture` events no longer say which button was hit.

## Do

- Mark voter-data containers so they stay masked: record-search results and voter cards, committee rosters and
  the member drawer, pending requests, report previews, petition tables, admin user lists. Use `ph-mask` (replay
  text), `ph-no-capture` (autocapture, or blocking a subtree), or a shared `data-voter-data` attribute matched by
  one `maskTextSelector`.
- Switch `maskTextSelector` from `"*"` to that selector, and narrow `maskReadableAttribute` to elements inside
  those containers. Drop `mask_all_text` / `mask_all_element_attributes` once autocapture inside the containers
  is blocked.
- Guard against regressions: a page that renders voter data outside a marked container leaks silently. Consider
  a test that renders the main voter-data components and asserts they sit inside a marked container.
- Update the project's "Privacy and masking" setting to match.

## Done when

Replays of record search, a committee roster and a report show readable navigation, buttons and headings with
voter data masked, and the leak check from 06 (search replay and event payloads for visible voter text) passes
on those pages with real local data.
