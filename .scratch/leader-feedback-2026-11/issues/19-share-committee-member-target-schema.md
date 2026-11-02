# 19 - Share the committee-member target schema

Status: ready-for-agent

## Problem

`reportExitDataSchema`, `removeCommitteeDataSchema`, and
`resignCommitteeDataSchema` repeat the same committee/member target fields:
`cityTown`, `legDistrict`, `electionDistrict`, and `memberId`. The copies already
have slightly different legislative-district parsing, making contract drift
more likely.

## Acceptance criteria

- [ ] The shared target fields have one Zod definition or a comparably direct shared source.
- [ ] Each public schema remains strict and retains its current accepted/rejected payload behavior.
- [ ] Schema tests cover the shared target behavior and report-specific refinements.
