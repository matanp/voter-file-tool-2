# 04 - "See more details" buttons are all named the same; popover loses focus

Status: ready-for-agent
Tier: 2 (accessibility and IA batch) · Priority: P2
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings A3, A4, B7

## Problem

- **A3.** The 100 result buttons are all named "See more details".
- **A4.** The details popover has no accessible name.
- **B7.** Press Escape in the popover: focus stays on the closed popover's content div instead of returning to the
  button.

## Fix

- `aria-label="Details for <name>, born <dob>"` on each button.
- `aria-labelledby` the popover's H2.
- Return focus to the trigger on close.

## Acceptance criteria

- [ ] Buttons have distinct names; the popover is named.
- [ ] After Escape, focus is on the button that opened it.

## Comments

### 2026-11-21 — UI makeover review

[ui-makeover/09](../../ui-makeover/issues/09-record-search-list-detail.md) proposes removing the per-row "See more details" button and the popover in favour of clickable rows and a detail pane or sheet. If 09 goes ahead, carry this ticket's naming and focus requirements over to the new row and pane.

### 2026-11-21

ui-makeover/09 (record search results as a dense list with a detail pane) replaces this ticket's visual parts. Don't build them separately. 09 must keep this ticket's accessibility requirements; if 09 is dropped, this ticket stands again.
