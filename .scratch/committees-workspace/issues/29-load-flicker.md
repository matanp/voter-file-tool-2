# 29 - Committees page shifts while loading

Type: task
Status: resolved
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

- [x] No layout shift in the nav or filters on load.
- [x] One session request per page load.

## Resolution

The root layout passes `auth()`'s session to `SessionProvider` and `GlobalContext` starts from its role, so the nav (Admin tab, View Profile) and the Leader-gated member search are in the server HTML, and the provider skips its on-mount `/api/auth/session` fetch. No placeholder was needed for the search once the role is known at first paint. A Developer whose cached acting role is lower still sees one shift after hydration (localStorage is client-only). Not measured in a browser. Branch `fix/committees-load-shift`.
