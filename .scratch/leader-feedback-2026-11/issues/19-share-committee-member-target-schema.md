# 19 - Share the committee-member target schema

Status: ready-for-agent
Merge blocking: no

## Problem

`reportExitDataSchema`, `removeCommitteeDataSchema`, and
`resignCommitteeDataSchema` repeat the same committee/member target fields:
`cityTown`, `legDistrict`, `electionDistrict`, and `memberId`. The copies already
have slightly different legislative-district parsing, making contract drift
more likely.

## Acceptance criteria

- [x] The shared target fields have one Zod definition or a comparably direct shared source.
- [x] Each public schema remains strict and retains its current accepted/rejected payload behavior.
- [x] Schema tests cover the shared target behavior and report-specific refinements.

## Comments

- 2026-11-02: Done on branch `share-committee-member-target-schema`. All three
  schemas extend one `committeeMemberTargetSchema`. One deliberate exception to
  "retains its current accepted/rejected payload behavior": `reportExitDataSchema`
  used to parse `legDistrict` with `z.coerce`, which accepted `true` (as 1),
  `[5]`, and `["5"]`. It now uses the remove/resign parser, which rejects them.
  Unifying the parsers is what the Problem section asks for. Numbers and numeric
  strings parse as before, and the only client (`submitExitReport`) sends a
  number or nothing. Other rejected inputs keep being rejected, some with a
  different message (blank strings now get "cannot be empty"; `null`, `false`,
  `[]`, and `{}` get "Invalid input").
