# 05 - Result count isn't announced; Advanced search opens out of view

Status: ready-for-agent
Tier: 2 (accessibility and IA batch) · Priority: P2
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings A5, B8

## Problem

- **A5.** After a search, the polite live region stays empty, so screen-reader users don't hear the result count.
- **B8.** With results showing, "Advanced search →" opens the form above the viewport; it looks like nothing
  happened.

## Fix

- Write "3,992 voters found" (or "No voters found") to the live region when results load.
- Scroll the advanced form into view and move focus to its first field when it opens.

## Acceptance criteria

- [ ] The region text updates on each search.
- [ ] Opening Advanced search brings the form into view with focus in it.
