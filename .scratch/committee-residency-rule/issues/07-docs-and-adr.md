# 07 - Record the AD-only residency rule in the docs

Status: ready-for-agent
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
