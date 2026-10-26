# Committee residency rule: AD only, not LD + ED

Status: needs-triage

Written 2026-10-25.

## The rule

> The ED only matters to the extent that the prospective member lives in an ED that's in the same
> assembly district as the ED they are being appointed to.

So a candidate is resident-eligible for a committee when they live anywhere in the committee's
assembly district. Their town, LD and ED don't matter.

### In terms of the schema

- **v** is a `VoterRecord`. **c** is a `CommitteeList`. The committee's LTED is
  ℓ(c) = (`c.cityTown`, `c.legDistrict`, `c.electionDistrict`).
- **AD_c** = trim(`LtedDistrictCrosswalk[ℓ(c)].stateAssemblyDistrict`). It is undefined when the
  crosswalk has no row for ℓ(c).
- **AD_v** = trim(`v.stateAssmblyDistrict`), the BOE's own record of the voter's AD.

```
ResidencyOK(v, c)  ⇔  ¬config.requireAssemblyDistrictMatch
                      ∨ (AD_c is defined ∧ AD_c ≠ "" ∧ AD_v = AD_c)
```

**These are explicitly not required:** `v.city = c.cityTown`, `v.L_T = c.legDistrict`,
`v.electionDistrict = c.electionDistrict`.

The full admission rule is unchanged apart from residency:

```
Eligible(v, c, t) ⇔ Registered(v) ∧ ¬PartyMismatch(v) ∧ ResidencyOK(v, c)
                    ∧ ¬AtCapacity(c, t) ∧ ¬ActiveInOtherCommittee(v, c, t)
                    (overridable stops can be bypassed with forceAdd + overrideReason)
```

**Modelling choice.** Read literally, the rule says AD(home LTED of v) = AD(ℓ(c)), which means
looking up the voter's own ED in the crosswalk. We use `v.stateAssmblyDistrict` directly instead.
Both server gates already do this, it is the BOE's source of truth, and it doesn't depend on
crosswalk coverage for the voter's LTED. The two should always agree. When they don't, that's a
data problem, not a rule problem.

## Where things stand

The server gates **already enforce this rule**:

- Admission gate: `validateEligibility` in `apps/frontend/src/lib/eligibility.ts`
  (the `ASSEMBLY_DISTRICT_MISMATCH` block)
- BOE standing audit: `detectFlagsForMembership` in `packages/shared-prisma/src/boeEligibilityFlagging.ts`

Both compare the voter's `stateAssmblyDistrict` with the crosswalk AD of the committee's LTED,
and only when `requireAssemblyDistrictMatch` is on. Neither checks LD or ED.

The LD + ED rule lives only in the **"Only eligible candidates" search filter**, which filters
on city + `L_T` + `electionDistrict`:

- `apps/frontend/src/app/committees/workspace/adapters.ts`: `candidateSearchQuery` (the workspace drawer)
- `apps/frontend/src/app/committees/AddCommitteeForm.tsx`: `extraSearchQuery` (the older form)

So nobody is wrongly blocked, but eligible voters from other EDs or towns in the same AD are
hidden by default. The docs also still record "Serve ED = Home ED" as the v1 rule:
`docs/SRS/tickets/2.9-serve-ed-vs-home-ed-resolution.md`, `docs/SRS/SRS_GAPS_AND_CONSIDERATIONS.md`
§5.3, `docs/SRS/SRS_SERVE_ED_VS_HOME_ED.md`.

## Implementation plan

### 1. Search filter (the real behaviour change)

- Add the committee's AD to what the client knows about a committee. The detail route
  (`apps/frontend/src/app/api/committee/[committeeListId]/detail/route.ts`) does the crosswalk lookup
  and returns `assemblyDistrict: string | null`, and `CommitteeRef` carries it.
- `candidateSearchQuery`: when `onlyEligible` is on, filter on `stateAssmblyDistrict = AD_c`
  instead of city / `L_T` / ED. `stateAssmblyDistrict` is already a searchable string field
  (`packages/shared-validators/src/constants.ts`).
- If AD_c is null (no crosswalk row), disable the eligible-only checkbox and say why. Don't
  silently fall back to the ED filter. The server will hard-stop anyway, so this matches.
- Make the same change in `AddCommitteeForm.tsx`, or retire that path if the drawer has replaced it.
- Update the doc comments at the top of `CandidateSearchStep.tsx` and on
  `CandidateSearchInput.onlyEligible` in `adapters.ts`.
- Privacy is unaffected: `/api/fetchFilteredData` is `ReadAccess` and isn't limited by
  jurisdiction, so a wider filter exposes nothing new.

### 2. Make the reason visible

- Add `lted.assemblyDistrict` to `EligibilitySnapshot` (`apps/frontend/src/lib/eligibilityPreflight.ts`)
  and show it next to the voter's AD in `EligibilitySnapshotPanel.tsx`. Make "Home ED"
  informational only.
- The `ASSEMBLY_DISTRICT_MISMATCH` message in `apps/frontend/src/lib/eligibilityMessages.ts` is
  static and doesn't mention ED, so it's fine as is. With the snapshot showing both ADs, the user
  can see why a candidate was stopped.

### 3. Tests that pin down the rule

- `apps/frontend/src/__tests__/lib/eligibility.test.ts`:
  - a voter with a different ED, LD and town but the same AD → eligible
  - a voter with the same ED but a different AD → `ASSEMBLY_DISTRICT_MISMATCH`
  - no crosswalk row → `ASSEMBLY_DISTRICT_MISMATCH`
- `boeEligibilityFlagging.test.ts`: a member with a different ED but the same AD → no flag.
- `adapters.test.ts`: the eligible-only query uses `stateAssmblyDistrict` and doesn't include
  `L_T`, `electionDistrict` or `city`.
- Drawer tests: the eligible-only checkbox is disabled when the committee has no AD.

### 4. Check the data before shipping

- The comparison is an exact string match after trimming. Until now the ED filter meant only
  same-ED voters ever reached the gate. Before shipping, check that `VoterRecord.stateAssmblyDistrict`
  and `LtedDistrictCrosswalk.stateAssemblyDistrict` use the same format (no `"133"` vs
  `"0133"` vs `"AD133"`), for example:

  ```sql
  SELECT DISTINCT "stateAssmblyDistrict" FROM "VoterRecord" ORDER BY 1;
  SELECT DISTINCT "stateAssemblyDistrict" FROM "LtedDistrictCrosswalk" ORDER BY 1;
  ```

- Check crosswalk coverage: every active `CommitteeList` LTED should have a crosswalk row.
- Check consistency: for each voter, the crosswalk AD of their home LTED (city, `L_T`, ED) should
  equal their `stateAssmblyDistrict`. Any mismatches are data issues to report, not code changes.

### 5. Docs

- Resolve ticket 2.9 and SRS gaps §5.3: Home ED may differ from Serve ED, and residency is decided
  by AD alone.
- Update `SRS_SERVE_ED_VS_HOME_ED.md`: the "Current Constraint" section describes the old filter.
- Add the residency rule to `CONTEXT.md`, and record the decision as an ADR in `docs/adr/`, since
  it reverses a documented v1 assumption.

### Open questions

Settled 2026-10-25 in `issues/01-settle-open-questions.md`. Town doesn't matter (confirmed by MCDC).
`requireAssemblyDistrictMatch` stays optional, and when it's off there's no residency check,
including in the eligible-only search filter.

## Architecture review: where the eligibility rules should live

From an `/improve-codebase-architecture` pass over the eligibility rules (2026-10-25). Nothing
here is decided yet. These are candidates to discuss.

### 1. One residency rule module (Strong, in-process)

**Files:** `packages/shared-prisma/src/eligibilityPredicates.ts` (`isAssemblyDistrictMismatch`),
`apps/frontend/src/lib/eligibility.ts` (inline crosswalk `findUnique`),
`packages/shared-prisma/src/boeEligibilityFlagging.ts` (`ltedKey`, `crosswalkByKey`,
re-normalised details), `apps/frontend/src/app/committees/workspace/adapters.ts`
(`candidateSearchQuery`), `apps/frontend/src/app/committees/AddCommitteeForm.tsx`
(`extraSearchQuery`), `apps/frontend/src/lib/eligibilityPreflight.ts` (the snapshot).

**Problem:** "Who may serve on this committee?" has no single home. The rule is written in five
places, and the search filter already encodes a different rule (same town, LD and ED) from the
gate (same AD). `isAssemblyDistrictMismatch` is shallow: callers pass in the config flag and two
strings, so its interface is nearly the whole function, and each caller still does its own
crosswalk lookup.

**Solution:** Make one module own the residency rule: resolving the committee's expected AD
(single and batch), checking a voter against it, giving the details for a mismatch, and producing
the "Only eligible candidates" search filter. The admission gate, BOE flagging, candidate search
and snapshot all call it.

**Wins:**
- Locality: the AD-only change becomes a one-module edit
- The search filter can't drift from the gate
- Leverage: one interface, four call sites
- A missing crosswalk row is handled once

### 2. Pure standing evaluation behind a fetch seam (Strong, local-substitutable)

**Files:** `apps/frontend/src/lib/eligibility.ts`, `packages/shared-prisma/src/boeEligibilityFlagging.ts`,
`apps/frontend/src/__tests__/lib/eligibility.test.ts`, `apps/frontend/src/__tests__/lib/boeEligibilityFlagging.test.ts`.

**Problem:** The party, AD and inactive rules run in two gates (`validateEligibility` and
`detectFlagsForMembership`). Each mixes database reads in with the checks, so a rule can only be
tested by mocking Prisma calls in order (`prismaMock.ltedDistrictCrosswalk.findUnique` …). Those
tests reach past the interface.

**Solution:** Gather the facts into a standing context first, using two adapters (single-candidate
for admission and preflight, batch for the BOE rescan). Then run one pure `evaluateStanding(ctx)`
that both gates share. The admission gate adds capacity, other-committee membership and the
override policy on top.

**Wins:**
- Rule tests become plain data tables
- Two adapters justify the seam
- Admission and BOE can't disagree
- Prisma mocks shrink to adapter tests

### 3. Build the preflight snapshot from the facts the gate checked (Worth exploring, in-process)

**Files:** `apps/frontend/src/lib/eligibilityPreflight.ts`,
`apps/frontend/src/app/api/committee/eligibility/route.ts`,
`apps/frontend/src/app/committees/EligibilitySnapshotPanel.tsx`.

**Problem:** The preflight reads the committee and the voter twice (once in the route or
preflight, once in `validateEligibility`). The snapshot can't show the committee's AD, which is
the fact that now decides residency.

**Solution:** Have the gate return the facts it evaluated along with its verdict, and build the
snapshot from them. This mostly comes for free if #2 is done.

**Wins:** the snapshot shows the deciding facts · fewer database round-trips · the snapshot can't
disagree with the verdict.

### 4. Delete the `eligibilityService.ts` re-export (Speculative, in-process)

**Files:** `apps/frontend/src/app/api/lib/eligibilityService.ts`,
`apps/frontend/src/__tests__/app/api/lib/eligibilityService.test.ts`.

**Problem:** It passes the deletion test: it only re-exports from `@voter-file-tool/shared-prisma`,
so removing it loses nothing and saves a step when reading the code.

**Solution:** Import from shared-prisma directly. If #1 or #2 goes ahead, this disappears as part
of that work.

### Top recommendation

**#1, one residency rule module.** The AD-only change is exactly the edit this module localises,
and it's where the rule has already drifted. If it lands first, step 1 of the implementation plan
becomes "the search filter asks the residency module". It also gives #2 a clean piece to pull in
later.
