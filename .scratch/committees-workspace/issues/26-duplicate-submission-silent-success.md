# 26 - Duplicate Leader submission says "Success" and stores nothing

Type: task
Status: resolved
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

- [x] A duplicate submit shows an error naming the existing pending request; no success toast.
- [x] The already-pending voter is marked in search and step 2.
- [x] API test for the 409.

## Resolution

`requestAdd` now answers a duplicate with 409 "Already pending for this committee: submitted <date>, waiting for an Admin to review it." (checked before eligibility); the drawer shows it as an error and search and step 2 mark the voter "Already pending" (not selectable for a submission; an Admin can still add them). Part 3 split to [33](33-vacant-rows-show-pending-candidates.md). Branch `fix/workspace-add-flow`.

Decided in the PR #183 review:

- An Admin can still select an already-pending voter in an add, with a warning. Blocking them would only send them
  to the Pending tab to accept the same row: `/api/committee/add` activates the existing SUBMITTED row.
- The 409 carries the submission date but no membership ID. `requestAdd` is open to RequestAccess with no committee
  scope, and the old 200 already said the voter was pending, so the date adds little; the ID had no reader.
- The date is formatted in UTC, like the Pending tab; [34](34-pending-submitted-date-uses-utc.md) fixes all three.
