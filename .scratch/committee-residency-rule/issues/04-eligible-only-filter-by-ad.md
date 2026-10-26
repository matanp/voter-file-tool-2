# 04 - "Only eligible candidates" filters by assembly district

Status: done
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

**2026-10-25.** Done in code and tests. A human still needs to check acceptance in the real
drawer: a voter from another ED in the same AD should show up and be addable without an override.
Release still waits on ticket 02's audit. The filter matches `VoterRecord.stateAssmblyDistrict`
exactly, so an AD that's padded or written in a different format would hide voters.

- `packages/shared-prisma/src/committeeResidency.ts`: new function
  `committeeResidencySearchFilter(ad, requireAssemblyDistrictMatch)`. It returns
  `[{ field: "stateAssmblyDistrict", values: [AD_c] }]` with the AD trimmed. It returns `[]` when the
  flag is off, and `null` when the flag is on but the committee has no AD. shared-validators already
  depends on shared-prisma, so shared-prisma can't import `SearchQueryField`. The field is typed
  structurally instead (`ResidencySearchField`).
- `packages/shared-prisma/package.json`: an `exports` map with `.` and `./committeeResidency`. The
  filter runs in the browser, and the package root also re-exports `PrismaClient` and
  `@prisma/client/runtime/library`, so `adapters.ts` imports the module by itself. The module
  imports only types from `@prisma/client`. Checks:
  - `next build` compiled, and the filter is in the committees page chunk without the Prisma
    runtime. (Page-data collection then failed on missing R2 env vars, which is unrelated.)
  - Nothing imported a deep path before this change.
  - shared-validators, report-server and voter-import-processor still typecheck.
- `apps/frontend/src/app/api/committee/[committeeListId]/detail/route.ts`: looks up the committee's
  AD with `findCommitteeAssemblyDistrict`, in parallel with the other reads, and returns it as
  `committee.assemblyDistrict`. As in ticket 06, the AD is returned whether the flag is on or off.
  The route also returns `requireAssemblyDistrictMatch` at the top level, next to
  `maxSeatsPerLted`. That's because the drawer is open to Leader and RequestAccess users, and the
  governance config route is Admin-only.
- `apps/frontend/src/lib/validations/committee.ts`: `committeeDetailResponseSchema` has both new
  fields.
- `apps/frontend/src/app/committees/workspace/committeeAction.ts`: new field
  `CommitteeRef.assemblyDistrict` (`string | null`), filled in by `committeeRefFrom`.
  `CommitteeSelector.tsx` builds a ref for the old remove and resign dialogs and passes `null`,
  since those adapters don't read it.
- `apps/frontend/src/app/committees/workspace/adapters.ts`: `candidateSearchQuery` takes
  `requireAssemblyDistrictMatch` and calls the module instead of filtering on city, `L_T` and ED.
  New function `canFilterEligibleOnly(committee, flag)`. The doc comment on `onlyEligible` is
  updated.
- `apps/frontend/src/app/committees/workspace/drawer/CandidateSearchStep.tsx` and
  `AddMemberFlow.tsx` (which passes `detail.requireAssemblyDistrictMatch`):
  - When the filter can't be built, the checkbox is disabled and unchecked. The search runs without
    it, never with the ED.
  - A note next to it says "Only eligible candidates is unavailable: this committee's ED has no
    crosswalk entry, so its assembly district is unknown." The checkbox points to it with
    `aria-describedby`.
  - The scope line now reads "Voters living in this committee's assembly district."
  - The doc comment at the top is updated.
- `_prototype/mockData.ts` and the detail fixtures in the committee component tests have the two
  new fields.

Decided: the checkbox is disabled only when the flag is **on** and the AD is null. With the flag
off, the server checks no residency, so a missing AD doesn't stop anyone. The checkbox stays
enabled and adds no condition, as ticket 01 says, and the hint then asks only for an ID or name.

Tests:

- `committeeResidency.test.ts` covers the new function.
- `adapters.test.ts` checks that the eligible-only query uses `stateAssmblyDistrict` and has no
  `city`, `L_T` or `electionDistrict`. It also covers a town without LDs, the flag being off, the
  no-AD case and `canFilterEligibleOnly`.
- `detail.test.ts` checks the AD (trimmed, null with no crosswalk row, still returned with the
  flag off) and the flag.
- `CommitteeActionDrawer.test.tsx` checks:
  - the default search uses the AD query
  - with no AD, the checkbox is disabled and shows its note
  - the flag being off

Left open: `AddCommitteeForm.tsx` still uses the old filter (ticket 05). The docs are ticket 07.
