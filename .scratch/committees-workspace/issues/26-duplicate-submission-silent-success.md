# 26 - Duplicate Leader submission says "Success" and stores nothing

Type: task
Status: ready-for-agent
Parent: ../map.md
Tier: 1 (fix now) · Priority: P1
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding B5

## Problem

As a Leader, submit voter X for ED 1, then submit X again. Every step passes and the toast says "Submitted your
request for approval", but only one SUBMITTED row exists. `app/api/committee/requestAdd/route.ts:205` returns
`{ success: true, message: "Request already submitted" }` and the drawer treats it as a new submission. Nothing in
the roster or search marks X as already pending.

## Fix

1. `requestAdd` returns 409 with "Already pending for this committee" for a duplicate; the drawer shows it as an
   error, not a success toast. Check callers and tests that rely on the idempotent 200.
2. Candidate search results and step 2 mark a voter who already has a SUBMITTED row for this committee
   ("Already pending").
3. The roster's vacant rows show pending candidates (e.g. "1 candidate pending").

Parts 1 and 2 are the bug. Part 3 can split into its own ticket if it grows.

## Acceptance criteria

- [ ] A duplicate submit shows an error naming the existing pending request; no success toast.
- [ ] The already-pending voter is marked in search and step 2.
- [ ] API test for the 409.
