# 03 - One name for Committees

Status: ready-for-agent
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding I1

## Problem

The nav says "Committee List", the page says "Committees", the home button says "Manage Committees".

## Fix

Use "Committees" everywhere (nav, home button, page title from accessibility/07, breadcrumbs). Update any e2e or
`run-frontend` selectors that match the old text.

## Acceptance criteria

- [ ] `grep -r "Committee List\|Manage Committees" apps/frontend/src` finds no user-visible strings.
