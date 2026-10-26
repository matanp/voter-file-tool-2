---
Status: accepted
---

# Committee residency is decided by assembly district alone

A voter may serve on a committee when they live in the committee's assembly district (AD). Their town, legislative district and election district don't matter, so a member's Home ED may differ from the ED they serve. This reverses the v1 assumption "Serve ED = Home ED" recorded in `docs/SRS/SRS_GAPS_AND_CONSIDERATIONS.md` §5.3 and closes ticket 2.9. MCDC confirmed that town doesn't matter, which matches NY Election Law's requirement of residence in the assembly district (`.scratch/committee-residency-rule/issues/01-settle-open-questions.md`).

The committee's AD is the `stateAssemblyDistrict` of its LTED's row in `LtedDistrictCrosswalk`. The voter's AD is their own `VoterRecord.stateAssmblyDistrict`. Both are trimmed and compared as exact strings. A committee with no crosswalk row, or an empty AD, has no AD anyone can match, so every candidate gets the `ASSEMBLY_DISTRICT_MISMATCH` hard stop. The rule lives in `packages/shared-prisma/src/committeeResidency.ts`: the admission gate (`validateEligibility`) calls `checkCommitteeResidency`, and the BOE standing audit (`runBoeEligibilityFlagging`) calls `prepareCommitteeResidencyChecks`.

## Considered Options

- **Look up the voter's home LTED in the crosswalk.** This is the literal reading of the rule: AD(voter's home ED) = AD(committee's ED). Rejected in favour of `stateAssmblyDistrict`: both server gates already used it, it is the BOE's own record of the voter's AD, and it doesn't depend on the crosswalk covering the voter's LTED. The two should always agree; when they don't, that is a data problem to report, not a rule problem (see the AD data audit, `.scratch/committee-residency-rule/issues/02-audit-ad-data.md`).
- **Keep the same-town requirement.** Rejected: MCDC confirmed town doesn't matter.
- **Make `requireAssemblyDistrictMatch` non-optional.** Rejected (decided by Matan Presberg). The setting stays as the fallback for going live without crosswalk data (ticket 1.1b) and for testing.

## Consequences

- When `requireAssemblyDistrictMatch` is off there is no residency check at all, in the gates and in the "Only eligible candidates" search filter.
- The server gates already enforced this rule before it was written down. The only behaviour change is the "Only eligible candidates" search filter, which still filtered on town, LD and ED when this ADR was written. Tickets 04 and 05 in `.scratch/committee-residency-rule/issues/` change it to filter on `stateAssmblyDistrict`. When the committee has no AD, the filter is disabled with an explanation; it doesn't fall back to the ED filter.
