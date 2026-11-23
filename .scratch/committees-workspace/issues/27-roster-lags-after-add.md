# 27 - Roster updates after the toast; focus goes to a seat that doesn't exist yet

Type: task
Status: resolved
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding B6

## Problem

Adding a member to a vacant seat (Admin): the success toast shows 3–4 s before the roster updates, and focus moves
to "Actions for seat 4", which isn't rendered yet. Remove does this well (focus goes to the committee H2).

## Fix

Await the roster refresh before the toast and focus move. Focus the new seat's actions button once it exists, else
the committee H2, as Remove does.

## Acceptance criteria

- [x] Toast and roster update together.
- [x] Focus lands on an element that exists.

## Resolution

The drawer now waits for the workspace's detail refresh (button stays "Adding…") before it toasts and closes. Focus then goes to the control for the seat the add filled, else the trigger, else the same row's new control, else the committee H2. Merged in PR #183 (`0313e4d7`).

A refresh that hasn't settled after 12 s (`COMPLETION_REFRESH_WAIT_MS`) no longer holds the drawer: it toasts and
closes, and focus is still moved once the refresh settles. Only a stuck refresh hits this (in production the detail refresh's p99 is 560 ms; see Comments);
waiting without a limit would leave the button on "Adding…". Remove and resign use the same focus order, which
matches what they did before (trigger, then the same row's new control, then the H2). Cleanups:
[35](35-add-flow-cleanups.md).

## Comments

### 2026-11-22

Merged in PR #183 (`0313e4d7`). A production check of the add flow (Admin view of a pending voter, the 409, the
toast/roster timing and focus) is handed to a separate Claude in Chrome session run by the maintainer; record its
results here.

Production timings before the merge (Sentry, last 30 days, environment `vercel-production`, server time only):
`GET /api/committee/[committeeListId]/detail`, the refresh the drawer waits for: 3,332 requests, p50 28 ms,
p95 341 ms, p99 560 ms, max 2.17 s. `POST /api/committee/add` p99 969 ms; `POST /api/committee/remove` p99 401 ms.
So the 12 s wait is over 5× the slowest refresh seen. To recheck after the deploy, query Sentry traces with
`environment:vercel-production` and the `transaction:` terms grouped in parentheses (an ungrouped `OR` lets local
`development` events in). In local dev, cold compiles brought a remove to 11.4 s, close to the limit.
