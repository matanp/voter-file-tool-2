# P2 — Election-Dates and Office-Names Deletes Have No Confirmation

**Status:** Open
**Priority:** P2 — Medium
**Effort:** 0.5 day
**Source:** [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md](../../WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md) (Finding 2)

## Problem

Two admin reference-data tables delete a row the instant the "Delete" button is clicked, with no
confirmation step:

- `apps/frontend/src/app/admin/dashboard/ElectionOffices.tsx`

  ```tsx
  <Button variant="destructive" onClick={() => handleDeleteOffice(office.id)} …>
    Delete
  </Button>
  ```

- `apps/frontend/src/app/admin/dashboard/ElectionDates.tsx` — same pattern with `handleDeleteDate`.

Both tables hold shared reference data consumed by petition and report generation, and there is no
undo. Every structurally similar admin surface already confirms before a destructive action, using
one of three different mechanisms:

- Radix `AlertDialog` — `apps/frontend/src/app/admin/data/LtedCrosswalkTab.tsx`
- Radix `Dialog` — `apps/frontend/src/app/admin/users/UsersClient.tsx` (jurisdiction removal)
- Native `confirm()` — `apps/frontend/src/components/reports/ReportCard.tsx`,
  `apps/frontend/src/app/admin/users/InviteManagement.tsx`,
  `apps/frontend/src/components/reports/PendingJobsIndicator.tsx`

So the two dashboard deletes are both **missing** a guard and inconsistent with the rest of the admin
surface, which also spreads across three confirmation mechanisms.

## Recommended Fix

### 1. Add confirmation to the two deletes

Route both deletes through a confirmation affordance before firing the mutation.

### 2. Prefer the Radix `AlertDialog` pattern

Standardize on the `AlertDialog` already used in `LtedCrosswalkTab.tsx` (styled, accessible, escapable)
rather than native `confirm()`. Reuse `apps/frontend/src/components/ui/alert-dialog.tsx`. A shared
"confirm destructive action" wrapper is optional but would let the native-`confirm()` call sites
converge later without widening this ticket.

Confirmation copy should name the item, e.g.:

> Delete election date "November 5, 2026"? This cannot be undone.

## Acceptance Criteria

- [ ] Deleting an election date requires an explicit confirm step before the row is removed.
- [ ] Deleting an office name requires an explicit confirm step before the row is removed.
- [ ] Cancelling the confirmation leaves the row and list state unchanged.
- [ ] The confirmation dialog names the specific item being deleted.
- [ ] Confirmation uses the Radix `AlertDialog` component (not native `confirm()`).

## Test Plan

Follow [test-type-safety](../../../skills/test-type-safety/SKILL.md) when adding tests.

### Component — `ElectionDates` / `ElectionOffices`

- Clicking Delete opens a confirmation dialog and does **not** call the delete mutation.
- Confirming calls the delete mutation once with the correct id.
- Cancelling calls no mutation and leaves the list intact.

## Files to Touch

| File | Change |
|------|--------|
| `apps/frontend/src/app/admin/dashboard/ElectionDates.tsx` | Add `AlertDialog` confirmation before delete |
| `apps/frontend/src/app/admin/dashboard/ElectionOffices.tsx` | Add `AlertDialog` confirmation before delete |
| `apps/frontend/src/__tests__/components/admin/dashboard/ElectionDates.test.tsx` | Confirm/cancel coverage |
| `apps/frontend/src/__tests__/components/admin/dashboard/ElectionOffices.test.tsx` | Confirm/cancel coverage |

## Implementation Order

1. Add component tests asserting confirm-before-delete for both tables.
2. Wire `AlertDialog` confirmation into `ElectionDates.tsx` and `ElectionOffices.tsx`.
3. Manually verify delete + cancel + confirm on `/admin/dashboard`.

## Related

- [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md](../../WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md)
- [3.7 LTED Crosswalk Import UI](3.7-lted-crosswalk-import-ui.md) (reference `AlertDialog` pattern)
