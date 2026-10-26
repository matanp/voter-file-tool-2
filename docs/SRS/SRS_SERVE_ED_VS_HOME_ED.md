# Serve ED vs Home ED — Design Considerations

**February 2026**

This document expands on [SRS_GAPS_AND_CONSIDERATIONS.md](SRS_GAPS_AND_CONSIDERATIONS.md) §5.3. The glossary defines **Serve ED** (where a member serves) and **Home ED** (where a voter resides) as possibly differing. This doc captures implementation options.

> **Decided 2026-10-25:** Home ED may differ from Serve ED. A voter may serve on a committee when they live in the committee's assembly district; their town, LD and ED don't matter. None of the options below is needed. See [ADR 0001](../adr/0001-committee-residency-by-assembly-district.md). The options are kept for history.

---

## Current Model

| Concept | Source | Field |
|---------|--------|-------|
| **Home ED** | BOE voter file | `VoterRecord.electionDistrict` |
| **Serve ED** | Committee / MCDC export | `CommitteeList.electionDistrict` |

The MCDC committee export uses columns `"Serve LT"` and `"Serve ED"` (see `bulkLoadUtils.ts`), which map to `CommitteeList`. When a voter is linked to a committee, their Serve ED is implicitly the committee's ED.

---

## Current Constraint

Residency is decided by the assembly district alone. A member's Home ED doesn't have to match their Serve ED.

- **Server gates.** The admission gate (`validateEligibility`) and the BOE standing audit (`runBoeEligibilityFlagging`) compare the voter's `VoterRecord.stateAssmblyDistrict` with the `stateAssemblyDistrict` of the committee's LTED in `LtedDistrictCrosswalk`, through `packages/shared-prisma/src/committeeResidency.ts`. They only check this when `requireAssemblyDistrictMatch` is on, and they never checked LD or ED.
- **"Only eligible candidates" search filter.** When this was written, the filter in the workspace drawer (`candidateSearchQuery` in `apps/frontend/src/app/committees/workspace/adapters.ts`) and in `AddCommitteeForm` (`extraSearchQuery`) still showed only voters in the committee's town, LD and ED. That hid eligible voters from elsewhere in the AD, but it never let an ineligible voter through: the server gates decide. The filter moves to `stateAssmblyDistrict` in `.scratch/committee-residency-rule/issues/04-eligible-only-filter-by-ad.md` and `05-addcommitteeform-path.md`, which land separately. When the committee has no AD, the filter is disabled with an explanation rather than falling back to the ED filter. When `requireAssemblyDistrictMatch` is off, it applies no residency filter.

---

## When Would Serve ED ≠ Home ED?

- **Recent move** — Member moved between EDs; roster reflects old ED until BOE updates.
- **Exception / override** — Party rules allow serving in a different ED (e.g., cross-ED vacancy fill).
- **BOE vs MCDC mismatch** — Different systems show different EDs; both may need to be tracked.

---

## Implementation Options

### Option 1: Explicit `serveED` on CommitteeMembership (future)

Add `serveED Int?` to the planned `CommitteeMembership` model. If null, default to `committeeList.electionDistrict`.

- **Effective Serve ED** = `membership.serveED ?? committee.electionDistrict`
- Allows per-member override when MCDC requires it.
- Requires admin UI and business rules for when override is allowed.

### Option 2: Relax Home ED filter (no schema change)

- Remove `electionDistrict` from the `extraSearchQuery` in `AddCommitteeForm`.
- Allow adding any voter in city/legDistrict regardless of Home ED.
- Optionally show a **warning** when `voter.electionDistrict !== committee.electionDistrict`.
- Serve ED remains = committee ED; Home ED can differ (tracked on voter record).

### Option 3: Config-driven validation

Add `allowCrossEdMembership` (or similar) to governance config:

- `false` (default) — enforce Home ED = Serve ED (the behavior at the time; superseded, see above).
- `true` — allow cross-ED membership; optionally surface as a warning.

No schema change; validation rules vary by config.

### Option 4: Hybrid (recommended for roadmap)

- **v1:** Keep Serve ED = `CommitteeList.electionDistrict`, Home ED = `VoterRecord.electionDistrict`. Relax or make configurable the Home ED filter; show a warning when they differ. Document as v1 behavior.
- **v2 (if needed):** Add `CommitteeMembership.serveED` when the join model ships. Use for explicit overrides when MCDC or party rules require it.

---

## Data Already Supports the Distinction

The model already stores both:

- **Home ED** — `VoterRecord.electionDistrict` (BOE)
- **Serve ED** — `CommitteeList.electionDistrict` (committee’s ED)

Serve ED ≠ Home ED needs no schema change: the server gates already check only the assembly district, and the search filter follow-up (ticket 04 above) removes the last place that matched on ED.

---

*See also: SRS_GAPS_AND_CONSIDERATIONS.md §5.3, SRS_DATA_MODEL_CHANGES.md CommitteeMembership model.*
