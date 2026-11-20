# 29 - Committees page shifts while loading

Type: task
Status: ready-for-agent
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding B9

## Problem

Loading `/committees`: the nav shows "…" and no Admin/Profile links until the session loads, and "Find a member"
mounts late and pushes the filters down. `/api/auth/session` is called twice on load (one took 1.6 s in prod).

## Fix

Pass the server session into the nav (no client fetch for first paint), reserve space for the member search, and
drop the duplicate session call.

## Acceptance criteria

- [ ] No layout shift in the nav or filters on load.
- [ ] One session request per page load.
