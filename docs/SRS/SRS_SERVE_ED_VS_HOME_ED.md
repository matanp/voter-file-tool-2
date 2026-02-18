# Serve ED vs Home ED — Design Considerations

**February 2026**

This document expands on [SRS_GAPS_AND_CONSIDERATIONS.md](SRS_GAPS_AND_CONSIDERATIONS.md) §5.3. The glossary defines **Serve ED** (where a member serves) and **Home ED** (where a voter resides) as possibly differing. This doc captures implementation options.

---

## Current Model

| Concept | Source | Field |
|---------|--------|-------|
| **Home ED** | BOE voter file | `VoterRecord.electionDistrict` |
| **Serve ED** | Committee / MCDC export | `CommitteeList.electionDistrict` |

The MCDC committee export uses columns `"Serve LT"` and `"Serve ED"` (see `bulkLoadUtils.ts`), which map to `CommitteeList`. When a voter is linked to a committee, their Serve ED is implicitly the committee's ED.

---

## Current Constraint

`AddCommitteeForm` pre-filters search so only voters whose **Home ED matches the committee's ED** appear in results. This effectively enforces Home ED = Serve ED — members must reside in the same ED as the committee they join.

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

- `false` (default) — enforce Home ED = Serve ED (current behavior).
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

The main gap is **enforcement**: the UI currently restricts membership to voters whose Home ED matches the committee. Supporting Serve ED ≠ Home ED is mainly a matter of relaxing or configuring that validation, plus optional explicit override fields on `CommitteeMembership` if needed.

---

*See also: SRS_GAPS_AND_CONSIDERATIONS.md §5.3, SRS_DATA_MODEL_CHANGES.md CommitteeMembership model.*
