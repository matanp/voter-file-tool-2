# 06 - Show the committee's AD in the eligibility snapshot

Status: ready-for-agent
Type: task
Blocked by: 03

## Why

Residency is decided by the committee's AD, but the eligibility snapshot doesn't show it. When a
candidate is stopped with `ASSEMBLY_DISTRICT_MISMATCH`, the user can't see the two values that were
compared. The message itself in `eligibilityMessages.ts` is fine as it is.

## To do

- Add `lted.assemblyDistrict` to `EligibilitySnapshot` in
  `apps/frontend/src/lib/eligibilityPreflight.ts`, filled in by the residency module.
- In `apps/frontend/src/app/committees/EligibilitySnapshotPanel.tsx`, show the committee's AD next
  to the voter's AD. When there's no crosswalk row, say so.
- Make "Home ED" visibly informational, so it doesn't look like a requirement.

## Acceptance

- For a candidate who fails the AD check, the panel shows both ADs.
- For a candidate from another ED in the same AD, the panel doesn't suggest a problem.

## Comments
