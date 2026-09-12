# P1 — Petition Outcomes Non-Petitioned Seat Picker

**Status:** Complete
**Priority:** P1 — High
**Effort:** 0.5-1 day
**Source:** [FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md](../../FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md) (P1: Petition Outcomes permits selection of non-petitioned seats)
**Depends on:** [2.6 Petition + Primary Outcome Tracking](2.6-petition-primary-outcome-tracking.md), [1.4 Seat Model](1.4-seat-model.md)

## Plan revision (2026-07-09)

The original plan below (disable seats where `isPetitioned === false`) was found to be
unimplementable as written: `Seat.isPetitioned` starts `false` for every seat and is set
`true` **only** as a side effect of this same route recording the seat's first outcome
(ticket [2.6](2.6-petition-primary-outcome-tracking.md): "Set `Seat.isPetitioned = true`
for `seatNumber` when first petition outcome is recorded. Once set true for the term, it
is immutable."). There is no independent signal in the data model for "this seat has a
petition underway before an outcome exists" — `/petitions` is a read-only PDF/report
generator and never writes `Seat` state. Disabling non-petitioned seats would make it
impossible to ever record a first outcome for any seat, breaking the feature rather than
fixing it.

**Corrected direction:** invert the disabled condition. Disable seats that are **already**
petitioned (`isPetitioned === true`), since that status is immutable for the term and
re-submitting an outcome for a decided seat should not be possible. Leave non-petitioned
seats selectable — that is the only path to record a seat's first outcome. This also
closes a real latent bug: `record/route.ts` currently has no guard against re-recording
an outcome for a seat that has already been decided.

The "Recommended Fix" and "Files to Touch" sections below are updated to reflect this.

## Problem

`apps/frontend/src/app/admin/petition-outcomes/page.tsx` loads every `Seat` for the selected committee:

```ts
seats: {
  orderBy: { seatNumber: "asc" },
  select: { id: true, seatNumber: true, isPetitioned: true },
}
```

`apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx` then renders every seat as a selectable `SelectItem`:

```tsx
<SelectItem key={s.id} value={String(s.seatNumber)}>
  Seat {s.seatNumber}
  {s.isPetitioned ? " (petitioned)" : ""}
</SelectItem>
```

That makes non-petitioned seats look like valid choices even though petition/primary outcomes are only meaningful for petitioned seats.

## Recommended Fix

### 1. UI — Disabled Already-Petitioned Seats

In `PetitionOutcomesClient.tsx`, render all seats, but disable seats that already have a
recorded outcome:

```tsx
<SelectItem
  key={s.id}
  value={String(s.seatNumber)}
  disabled={s.isPetitioned}
>
  Seat {s.seatNumber}
  {s.isPetitioned
    ? " — Outcome already recorded"
    : ""}
</SelectItem>
```

Use the existing disabled item behavior from `components/ui/select.tsx`; it already applies Radix `data-[disabled]` styling.

### 2. Client-State Guard

Add a local guard so stale state cannot submit a seat whose outcome was already recorded
(e.g. after committee changes or data refresh):

```ts
const selectedSeat = seats.find((s) => s.seatNumber === seatNumber);
const selectedSeatIsAvailable = selectedSeat != null && !selectedSeat.isPetitioned;
```

Then require `selectedSeatIsAvailable` in:

- `validateAndOpenConfirm`
- `handleConfirmSubmit`
- the **Record outcome** button disabled state

Validation copy:

> Select a seat that has not already had its outcome recorded.

When a committee has no available (non-petitioned) seats, render a short helper message below the seat picker:

> Every seat in this committee already has a recorded outcome for this term.

### 3. API Hardening

`POST /api/admin/petition-outcomes/record` currently has no guard preventing a second
submission for a seat that was already petitioned — it unconditionally re-applies
`isPetitioned: true` and re-processes candidates, contradicting ticket 2.6's own intent
that the flag is "immutable" once set. Add for the same PR:

- After loading the seat, reject `seat.isPetitioned === true` with `409`.
- Do not proceed to any `tx.committeeMembership` writes or audit logging on that rejection path.

## Acceptance Criteria

- [x] The seat picker still shows every seat for the selected committee.
- [x] Non-petitioned (available) seats are enabled and selectable.
- [x] Seats that already have a recorded outcome are disabled and labeled with the reason they cannot be selected.
- [x] If a committee has no available seats, the UI explains that every seat already has a recorded outcome.
- [x] The client cannot open the confirmation dialog or submit with an already-petitioned selected seat, including stale state after committee changes.
- [x] Direct API submission for an already-petitioned seat is rejected with 409 and does not create/update memberships or write petition audit rows.
- [x] Existing non-petitioned-seat outcome recording behavior remains unchanged.

## Test Plan

Follow [test-type-safety](../../../skills/test-type-safety/SKILL.md) when adding tests.

### Component — `PetitionOutcomesClient`

- Renders non-petitioned (available) seats as enabled options.
- Renders already-petitioned seats as disabled options with the "already recorded" reason.
- Shows the no-available-seats helper message when every seat already has a recorded outcome.
- Prevents confirmation/submission when selected state is stale or points to an already-petitioned seat.

### API — `petition-outcomes/record`

- Rejects a valid-looking payload when the target seat exists but `isPetitioned=true`, with 409.
- Does not call `seat.update`, `committeeMembership.create/update`, or audit logging on that rejection path.
- Still records outcomes for `isPetitioned=false` seats (unchanged happy path).

## Files to Touch

| File | Change |
|------|--------|
| `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx` | Disable already-petitioned seat options, add explanatory labels/helper text, add selected-seat guard |
| `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` | Backend invariant: reject re-recording outcomes for an already-petitioned seat |
| `apps/frontend/src/__tests__/components/admin/petition-outcomes/PetitionOutcomesClient.test.tsx` | Add focused component coverage for enabled/disabled seat behavior |
| `apps/frontend/src/__tests__/api/admin/petition-outcomes/record.test.ts` | Add already-petitioned rejection coverage |

## Implementation Order

1. Add component test coverage for petitioned vs. non-petitioned seat rendering.
2. Update `PetitionOutcomesClient.tsx` to disable already-petitioned seats, explain why, and guard stale selected-seat state.
3. Update `record/route.ts` to reject re-recording for an already-petitioned seat, and add API tests.
4. Manually verify `/admin/petition-outcomes` with a committee that has mixed petitioned and non-petitioned seats, and with a committee that has no available (non-petitioned) seats.

## Verification

- `apps/frontend/node_modules/.bin/tsc --noEmit --pretty false --project apps/frontend/tsconfig.json`
- `node_modules/.bin/jest --runTestsByPath src/__tests__/api/admin/petition-outcomes/record.test.ts src/__tests__/components/admin/petition-outcomes/PetitionOutcomesClient.test.tsx --runInBand` from `apps/frontend`

The repo-recommended `pnpm --filter voter-file-tool ...` wrapper was not used for final verification in this environment because the installed pnpm 11 runtime tried to purge/reinstall modules for the pnpm 8 lockfile and aborted without a TTY.

## Related

- [FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md](../../FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md)
- [2.6 Petition + Primary Outcome Tracking](2.6-petition-primary-outcome-tracking.md)
- [2.7 Weight / Designation Logic](2.7-weight-designation-logic.md)
- [4.4 Scenario 4: Petition Outcome Lifecycle + Traceability](4.4-scenario4-petition-outcomes-traceability.md)
