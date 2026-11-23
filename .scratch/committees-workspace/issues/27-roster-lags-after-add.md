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

The drawer now waits for the workspace's detail refresh (button stays "Adding…") before it toasts and closes. Focus then goes to the control for the seat the add filled, else the trigger, else the same row's new control, else the committee H2. Branch `fix/workspace-add-flow`.

A refresh that hasn't settled after 12 s (`COMPLETION_REFRESH_WAIT_MS`) no longer holds the drawer: it toasts and
closes, and focus is still moved once the refresh settles. Only a stuck refresh hits this (the usual lag is 3–4 s);
waiting without a limit would leave the button on "Adding…". Remove and resign use the same focus order, which
matches what they did before (trigger, then the same row's new control, then the H2). Cleanups:
[35](35-add-flow-cleanups.md).
