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
