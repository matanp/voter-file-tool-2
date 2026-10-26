# 06 - Show the committee's AD in the eligibility snapshot

Status: resolved
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

**2026-10-25.** Done. `EligibilitySnapshot.lted.assemblyDistrict` (`string | null`) is filled in by
`findCommitteeAssemblyDistrict` from the residency module. That's a crosswalk `findUnique`, run
alongside the voter lookup in `runEligibilityPreflight`. It's filled in whether or not
`requireAssemblyDistrictMatch` is on, because it's a fact about the committee. The hard stop still
follows the flag. `EligibilitySnapshotPanel` now shows "Voter's Assembly District" next to
"Committee's Assembly District". When the AD is null it says "Unknown: the committee's ED has no
crosswalk entry". "Home ED" is muted and labelled "(informational: it doesn't need to match the
committee's ED)". `committeeResidency.ts` is unchanged.

Tests: `api/committee/eligibility.test.ts` covers the AD being filled in and trimmed, being null
with no crosswalk row, and being filled in with the flag off. A new
`components/committees/EligibilitySnapshotPanel.test.tsx` covers both ADs showing on an AD
mismatch, no problem showing for another ED in the same AD, and the null-AD message. The snapshot
fixtures in the drawer and request-form tests gained the new field.
