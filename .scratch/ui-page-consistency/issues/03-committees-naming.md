# 03 - One name for Committees

Status: resolved
Resolution: nav, Home hero button and two stray strings now say "Committees"; fixed on fix/committees-naming.
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding I1

## Problem

The nav says "Committee List", the page says "Committees", the home button says "Manage Committees".

## Fix

Use "Committees" everywhere (nav, home button, page title from accessibility/07, breadcrumbs). Update any e2e or
`run-frontend` selectors that match the old text.

## Acceptance criteria

- [x] `grep -r "Committee List\|Manage Committees" apps/frontend/src` finds no user-visible strings.

## Comments

### 2026-11-21 — Resolved

[accessibility/07](../../accessibility/issues/07-per-page-titles.md) hasn't landed, so this uses the
titles that exist today: the workspace `h1` already reads "Committees", there is no per-page
`<title>` metadata yet, and there are no breadcrumbs outside `committees/_prototype/`.

Changed: header nav "Committee List" → "Committees"; Home hero button "Manage Committees" →
"Committees"; legacy `/committees` fallback "Committee Lists not found" → "Committees not found";
the discrepancy table column "Committee List Upload value" → "Committee Upload value".

No e2e or `run-frontend` selector matched the old text. The grep still matches "Elected County
Committee List": that is the Board of Elections export's file name, quoted in a parser comment
and test fixtures, not a UI string. When 07 adds per-page titles, the Committees title should
use the same word.
