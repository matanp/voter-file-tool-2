# 05 - Migrate or retire the AddCommitteeForm search filter

Status: ready-for-agent
Type: task
Blocked by: 03

## Why

`apps/frontend/src/app/committees/AddCommitteeForm.tsx` has its own `extraSearchQuery`, which
still filters on city, `L_T` and ED. The workspace drawer may have replaced this form. Either way,
it shouldn't keep a separate copy of the old rule.

## To do

- Find out whether `AddCommitteeForm` is still reachable from any route or component.
- If it is unreachable, delete it along with its tests and any code only it uses.
- If it is still reachable, replace `extraSearchQuery` with the residency module's filter
  function (ticket 04) and match the drawer's handling of a null AD.

## Acceptance

- Nothing in the codebase still builds an eligibility filter from city, `L_T` and
  `electionDistrict`.

## Comments
