# 04 - "Only eligible candidates" filters by assembly district

Status: ready-for-agent
Type: task
Blocked by: 01, 03, 08

Don't release until ticket 02's audit has come back clean.

## Why

The "Only eligible candidates" search filter still uses the old rule: same town, `L_T` and
`electionDistrict`. Eligible voters elsewhere in the committee's AD are therefore hidden by default,
even though the server would admit them. This is the only part of the feature that users will
notice.

## To do

- `apps/frontend/src/app/api/committee/[committeeListId]/detail/route.ts`: use the residency
  module (ticket 03) to find the committee's AD and return `assemblyDistrict: string | null`.
- Add `assemblyDistrict` to `CommitteeRef`.
- Add a function to the residency module that builds the eligible-only search filter
  (`stateAssmblyDistrict = AD_c`). `candidateSearchQuery` in
  `apps/frontend/src/app/committees/workspace/adapters.ts` calls it instead of filtering on city,
  `L_T` and ED. There is no town requirement (ticket 01). When `requireAssemblyDistrictMatch` is off,
  the eligible-only filter adds no residency condition, matching the server gates.
- When `assemblyDistrict` is null, disable the eligible-only checkbox and explain why (the
  committee's ED has no crosswalk entry). **Don't** fall back to the ED filter. The server would
  stop the candidate anyway.
- Update the doc comments at the top of `CandidateSearchStep.tsx` and on
  `CandidateSearchInput.onlyEligible` in `adapters.ts`.
- Privacy is unaffected: `/api/fetchFilteredData` is `ReadAccess` and isn't limited by
  jurisdiction.

## Tests

- `adapters.test.ts`: the eligible-only query uses `stateAssmblyDistrict` and doesn't include
  `L_T`, `electionDistrict` or `city`.
- Drawer tests: the eligible-only checkbox is disabled when the committee has no AD.

## Acceptance

- In the workspace drawer, with "Only eligible candidates" on, a voter from another ED in the same
  AD appears in the results and can be added without an override.

## Comments
