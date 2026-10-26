# 05 - Migrate or retire the AddCommitteeForm search filter

Status: done
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

**2026-10-25.** Done. `AddCommitteeForm` is still reachable, so it was migrated rather than
deleted.

Reachability: `apps/frontend/src/app/committees/page.tsx` renders `CommitteeWorkspace` only when
`process.env.COMMITTEES_WORKSPACE === "1"`. Otherwise (the default; `.env.example` has the flag
commented out) it renders `CommitteeSelector`, which renders `AddCommitteeForm` in its "Add
committee member" panel for any acting privilege other than ReadAccess. So the flag alone decides
whether the form is reachable. It goes away when ticket 16 makes the workspace unconditional. Until
then it's the live add path wherever the flag isn't set.

- `apps/frontend/src/app/api/fetchCommitteeList/route.ts` (which feeds `CommitteeSelector`) now
  also returns `assemblyDistrict` (from `findCommitteeAssemblyDistrict`, looked up in parallel with
  the governance config) and `requireAssemblyDistrictMatch`, as the detail route has since ticket
  04. The AD is returned whether the flag is on or off. `FetchCommitteeListResponse` has both
  fields.
- `CommitteeSelector.tsx` keeps both in state (the AD is cleared with the rest of the detail state)
  and passes them to `AddCommitteeForm`.
- `AddCommitteeForm.tsx`: `extraSearchQuery` is now `committeeResidencySearchFilter(AD, flag)`,
  imported from `@voter-file-tool/shared-prisma/committeeResidency` as `adapters.ts` does. No city,
  `L_T` or ED. With the flag off, the checkbox adds no condition. With the flag on and no AD, the
  checkbox is disabled and unchecked, and the drawer's note explains why (exported as
  `ELIGIBLE_ONLY_UNAVAILABLE_MESSAGE`). It never falls back to the ED.
- `RecordSearchForm.tsx`: new optional prop `optionalExtraSearchUnavailableReason`. When it's set,
  the optional-search checkbox is disabled and unchecked, the extra query is never applied, and the
  reason is shown and linked with `aria-describedby`. Other callers don't pass it, so they're
  unchanged.

Tests: `fetchCommitteeList.test.ts` checks the AD (trimmed, null with no crosswalk row, still
returned with the flag off) and the flag. Its exact-body expectations now include the two new
fields. The new `AddCommitteeForm.search.test.tsx` checks that the eligible-only query is
`stateAssmblyDistrict` with no `city`, `L_T` or `electionDistrict`, that the flag being off adds
nothing, and that with no AD the checkbox is disabled with its note and the search runs by name
only.

Acceptance grep: no other code builds an eligibility filter from city, `L_T` and ED. The only
leftover is copy in the dev-only mock `_prototype/AddMemberDrawerStub.tsx` ("Registered outside ED
…"). It filters mock data by a boolean, not by district, so it was left as is.
