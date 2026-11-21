# 12 - Advanced search criteria as chips

Status: ready-for-agent

Blocked by: 05, 09

Part of [ui-makeover](../spec.md).

## Problem

- **Tall criteria blocks.** At 1280 the advanced builder is a column about 500px wide. Each criterion is a tall shadowed block; the Name criterion alone is about 230px (`components/search/SearchRow.tsx:50`).
- **Alarming remove buttons.** Remove is a solid red destructive square (`SearchRow.tsx:96`) for a harmless action.
- **Competing buttons.** A dark "Add Search Criteria" and a green "Submit" compete, while the simple mode calls the same action "Search" (`VoterRecordSearch.tsx:233-258`).
- **Stale results.** Switching modes keeps the old results with nothing showing which criteria produced them.

## Proposal

- Criteria as one row of removable chips (`Name: Alex Sample ×` `Street: Example St ×`), then `+ Add filter`.
- `+ Add filter` opens a popover with the field picker and its inputs; it becomes a bottom sheet at 375.
- One **Search** button. Chip × is a ghost icon.
- A segmented "Name / Advanced" toggle on the same line as Search.
- While criteria have unsubmitted edits, dim the results.

## Acceptance

- The builder with three criteria is ≤ about 120px tall at 1280.
- No destructive-styled controls.
- One primary action label across both modes.

Evidence: reviews/recordsearch.md §1C.

## Comments

### 2026-11-21 - triage

Ready for agent after 09. Not prototyped, so take before/after screenshots for review.
