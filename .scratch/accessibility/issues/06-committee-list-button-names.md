# 06 - Committee sidebar buttons read wrong and are all tab stops

Status: ready-for-agent
Tier: 1 (fix now) · Priority: P1
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings A1, A11

## Problem

- **A1.** `app/committees/workspace/CommitteeGrid.tsx:115-131` builds the button name from adjacent spans with no
  separator, so ED 1 with 4/4 reads "Brighton ED 14/4 seats filled" (heard as ED fourteen).
- **A11.** All 659 sidebar buttons are tab stops, so keyboard users tab through every ED to reach the detail pane.

## Fix

1. Give the button an explicit name: `aria-label="Brighton ED 1, LD 17, 4 of 4 seats filled, 1 pending"` (LD and
   pending only when shown). Hide the visual spans from the name.
2. Add a "Skip to committee details" link before the list, or a roving tabindex (one tab stop, arrow keys move).
   The skip link is the smaller change; the roving tabindex is the better list. Pick one in the PR.

## Acceptance criteria

- [ ] Accessible names have separators; test asserts one.
- [ ] From the sidebar's first control, the detail pane is reachable in a few Tab presses.
- [ ] A VoiceOver check of the list is noted here.
