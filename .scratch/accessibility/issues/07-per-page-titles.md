# 07 - Every page's title is "Open Source Politics"

Status: ready-for-agent
Tier: 2 (accessibility and IA batch) · Priority: P2
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding A2

## Problem

Every route has the same `<title>`, so browser tabs, history and screen-reader page announcements can't tell pages
apart.

## Fix

Set `metadata.title` per route (with a root `title.template` like `%s · Open Source Politics`). For the committees
workspace, include the selected committee if it's cheap (`generateMetadata`).

## Acceptance criteria

- [ ] Each top-level route and admin page has a distinct title.
