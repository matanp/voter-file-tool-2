# 07 - Record the AD-only residency rule in the docs

Status: resolved
Type: task
Blocked by: 01

## Why

The docs still record "Serve ED = Home ED" as the v1 rule. That assumption is being reversed, and
the reversal should be recorded where the domain model lives.

## To do

- Add an ADR to `docs/adr/`: residency is decided by the assembly district alone, the voter's AD
  comes from `stateAssmblyDistrict` rather than a crosswalk lookup of their home ED (see "Modelling
  choice" in the spec), and ticket 01's answers.
- Add the residency rule to `CONTEXT.md`.
- Resolve `docs/SRS/tickets/2.9-serve-ed-vs-home-ed-resolution.md` and
  `docs/SRS/SRS_GAPS_AND_CONSIDERATIONS.md` §5.3: Home ED may differ from Serve ED.
- Update the "Current Constraint" section of `docs/SRS/SRS_SERVE_ED_VS_HOME_ED.md`, which describes
  the old filter.

## Acceptance

- No doc still says a member's home ED must equal the ED they serve.

## Comments

- 2026-10-25: Done. Files changed:
  - `docs/adr/0001-committee-residency-by-assembly-district.md` (new): the decision. Residency is
    decided by the AD alone; the voter's AD is `VoterRecord.stateAssmblyDistrict`, not a crosswalk
    lookup of their home LTED; ticket 01's answers (town dropped, `requireAssemblyDistrictMatch`
    stays optional). Names the module (`committeeResidency.ts`, `checkCommitteeResidency`,
    `prepareCommitteeResidencyChecks`). There were no earlier ADRs, so this is 0001 and
    `docs/adr/` is new. The reversed assumption lived in the SRS docs, not an ADR, so nothing is
    marked superseded; the SRS docs point to the ADR instead.
  - `CONTEXT.md`: adds Assembly District, Committee Residency, Home ED and Serve ED under
    "Geography and scope".
  - `docs/SRS/tickets/2.9-serve-ed-vs-home-ed-resolution.md`: status Resolved, with a Resolution
    section (Home ED may differ, neither option A nor B, enforcement points, follow-ups 04/05).
  - `docs/SRS/SRS_GAPS_AND_CONSIDERATIONS.md`: §5.3 and its summary row set to Resolved, with the
    new rule.
  - `docs/SRS/SRS_SERVE_ED_VS_HOME_ED.md`: decision banner; "Current Constraint" rewritten to
    describe the gates and the search filter (old filter still live until tickets 04/05 land);
    stale "current behavior" lines updated.
  - `docs/SRS/tickets/README.md`, `docs/SRS/FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md`: ticket
    2.9 shown as done/resolved instead of "v1 policy choice pending".
  - `docs/SRS/tickets/2.2-warning-system.md`, `docs/BRANCH_ARCHITECTURE_REVIEW.md`: the stale
    `eligibilityService.ts` / `isAssemblyDistrictMismatch` references that ticket 03 left for this
    ticket.
