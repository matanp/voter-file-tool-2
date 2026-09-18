# 10: Validate the whole roster before filtering activation candidates

**Status:** resolved

**Priority:** P1 (production blocker from the branch code review)

**What to fix:** Planning currently uses one filtered `committeeMembers` collection for three
different domain questions: who is present in the source roster, who is eligible for immediate
activation, and how many seats the source roster intends to fill. A row is removed from that
collection as soon as its voter record is missing or one claimed field disagrees. That produces
three incorrect outcomes:

1. A voter listed in committee A with a field discrepancy and in committee B with matching fields
   is not recognized as a cross-committee duplicate and can be activated in B.
2. Capacity is checked against discrepancy-free unique voters instead of all structurally valid
   intended assignments, understating a committee that may later gain members through discrepancy
   acceptance.
3. An existing active member who is present in the file but has a name or address discrepancy can
   be planned for removal as though the file omitted them.

Model these concepts separately before voter-file comparison:

- **Present assignments:** every structurally valid canonical entry, indexed by VRCNUM and
  committee.
- **Intended members per committee:** distinct VRCNUMs present for that committee, including rows
  that later become discrepancies.
- **Activation candidates:** intended members that pass voter existence, claimed-field,
  cross-committee and live database checks.

Cross-committee duplicate detection and capacity validation operate on present/intended
assignments. Removal reconciliation uses intended presence. Only membership creation/reactivation
uses activation candidates.

Treat repeated identical rows for the same VRCNUM and committee as one intended seat for capacity;
retain source-row information so a later duplicate-row warning can be added without changing this
model. A VRCNUM assigned to distinct committees is a discrepancy and is excluded from every
activation candidate, even when one of its rows also has an ordinary voter-field discrepancy.

**Blocked by:** None

## Acceptance criteria

- [x] The source-assignment index is built from all structurally valid entries before voter-file
      lookups or claimed-field comparison filter any row.
- [x] A voter in two committees is never planned or applied as an activation in either committee,
      including when only one row has an ordinary voter-field discrepancy or missing voter record.
- [x] The resulting discrepancy retains both the assignment conflict and any ordinary discrepancy
      reasons already found.
- [x] Capacity uses distinct intended VRCNUM assignments per committee, including discrepancies,
      and names every committee over `maxSeatsPerLted` on the dry-run plan.
- [x] An existing active member present in the same committee's source rows is not planned or
      applied as a removal merely because the row has a voter-field discrepancy.
- [x] An existing active member genuinely absent from the committee's source rows is still removed
      with the current reason and audit event.
- [x] Applying retains the live active-elsewhere and unique-constraint guards; planning does not
      become the sole race defense.
- [x] Focused tests cover the three failure modes above plus identical duplicate rows in one
      committee.

## Verification

- Run the plan, apply, membership-type, rejected-row and route test suites.
- Run `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`.
- Confirm the known 2026–2028 CSV still reports 1,470 entries, 437 committees, zero committees over
  the configured four-seat maximum, and no cross-committee duplicate VRCNUMs.

## Out of scope

- Automatically choosing a committee for a cross-committee duplicate.
- Changing how an Admin resolves a recorded assignment conflict.
- Inventing a committee identity for parser-rejected rows that did not supply one.

