# P2 — `seat.isPetitioned` Is Overloaded: Recorded-Outcome Lock vs. Seat Type Label

**Status:** Open
**Priority:** P2 — Medium
**Effort:** 1 day
**Source:** [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md](../../WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md) (Finding 3)
**Depends on:** [1.4 Seat Model](1.4-seat-model.md), [2.6 Petition + Primary Outcome Tracking](2.6-petition-primary-outcome-tracking.md)
**Related (do not duplicate):** [P1 Petition Outcomes Non-Petitioned Seat Picker](P1-petition-outcomes-non-petitioned-seat-picker.md) (Complete) — that ticket fixed the *picker* gating; this ticket is about the *label semantics* the same flag drives elsewhere.

## Problem

`Seat.isPetitioned` carries two different user-facing meanings depending on which surface reads it.

1. **Recorded-outcome lock (write path).**
   `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` flips the flag `false → true`
   inside its transaction, purely as a single-use "outcome already recorded" latch:

   ```ts
   const claimedSeat = await tx.seat.updateMany({
     where: { id: seat.id, isPetitioned: false },
     data: { isPetitioned: true },
   });
   if (claimedSeat.count !== 1) throw new OutcomeAlreadyRecordedError();
   ```

   The recorder UI `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx`
   consistently reads it this way — disabling seats whose outcome is already recorded.

2. **Seat type label (read path).**
   The roster in `apps/frontend/src/app/committees/CommitteeSelector.tsx` renders the *same* flag as
   the seat's **type**:

   ```tsx
   {seat.isPetitioned ? "Petitioned" : "Appointed"}
   ```

Because only the petition-outcomes route ever sets the flag, the roster's "Petitioned/Appointed"
column does not reflect a seat's actual membership type — it reflects "has a petition outcome been
recorded." Two concrete drifts result:

- A seat filled by a directly-added `PETITIONED` member (via
  `apps/frontend/src/app/committees/AddCommitteeForm.tsx`, which sets `membershipType` but never
  touches `Seat.isPetitioned`) still shows **"Appointed"** in the roster.
- After any petition outcome is recorded, the seat's roster row relabels to **"Petitioned"**
  regardless of the outcome, and an admin cross-checking the roster against the outcomes recorder
  sees contradictory signals about what the seat is and whether it is still recordable.

## Recommended Fix

Decide the intended semantics and make each surface read a field that matches its label. Two viable
directions (pick one; do not leave the flag doing both jobs):

- **Option A — Rename/clarify the flag as an outcome latch.** Treat `isPetitioned` as
  "petition outcome recorded" everywhere. Change the roster to derive the *type* column from actual
  membership data (e.g. the occupant's `membershipType`) instead of `seat.isPetitioned`, and adjust
  the roster label wording so it stops implying seat type.
- **Option B — Separate the two concepts.** Keep a seat-type concept distinct from an
  "outcome recorded" concept so the recorder latch and the roster label no longer share one boolean.
  (Larger; requires a schema/data-model change and touches ticket 1.4 / 2.6 — scope carefully.)

Prefer Option A unless a genuine seat-type concept is required, since it avoids a migration and keeps
the existing latch behavior the petition recorder already depends on.

## Acceptance Criteria

- [ ] The roster "type" column reflects the seat/occupant's actual membership type, not the
      outcome-recorded latch.
- [ ] A directly-added `PETITIONED` member is not mislabeled "Appointed" in the roster.
- [ ] Recording a petition outcome does not silently change a seat's displayed *type* in a way that
      misrepresents the membership.
- [ ] The petition-outcomes recorder's "outcome already recorded" behavior is unchanged.
- [ ] No surface reads `Seat.isPetitioned` for a meaning other than the one chosen in the fix.

## Test Plan

Follow [test-type-safety](../../../skills/test-type-safety/SKILL.md) when adding tests.

### Component — `CommitteeSelector` roster

- A seat with a directly-added `PETITIONED` occupant shows the correct type label.
- A seat whose petition outcome was recorded shows a label consistent with the chosen semantics.

### Regression — petition-outcomes recorder

- Recording still latches the seat and disables re-recording (existing behavior preserved).

## Files to Touch

| File | Change |
|------|--------|
| `apps/frontend/src/app/committees/CommitteeSelector.tsx` | Derive the roster type column from membership data, not `seat.isPetitioned` |
| `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx` | Confirm it reads the latch semantics (adjust naming/comments if flag is renamed) |
| `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` | Only if Option B / rename is chosen |
| `apps/frontend/prisma/schema.prisma` | Only if Option B (separate field) is chosen |

## Implementation Order

1. Confirm intended semantics with product (Option A vs. B) before writing code.
2. Add roster component tests for the correct type label under each scenario.
3. Update `CommitteeSelector.tsx` to read the correct source for the type column.
4. If renaming/splitting, update the recorder route + schema and migrate.
5. Manually verify roster vs. petition-outcomes recorder for a committee with mixed seats.

## Related

- [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md](../../WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md)
- [1.4 Seat Model](1.4-seat-model.md)
- [2.6 Petition + Primary Outcome Tracking](2.6-petition-primary-outcome-tracking.md)
- [P1 Petition Outcomes Non-Petitioned Seat Picker](P1-petition-outcomes-non-petitioned-seat-picker.md)
