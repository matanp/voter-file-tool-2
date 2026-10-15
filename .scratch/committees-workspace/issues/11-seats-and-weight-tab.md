# 11 - Seats & Weight tab

Type: task
Status: resolved
Blocked by: 08
Parent: ../map.md

## Question

Execute plan §7.3: move every seat and weight concern into one tab — the LTED total-weight editor (`updateLtedWeight`), vacancy/filled summary, designation-weight total, per-seat breakdown, missing-weight warnings, and occupancy verification. This is what removes the unbounded transition from `AddCommitteeForm` into the LTED weight input.

Tests (plan §12.2): weight editing and error handling. Do not communicate warnings through color alone.

## Answer

Built in Lane B (worktree off `committees-workspace` at `8413196`, after ticket 20).

### Seats & Weight tab (`apps/frontend/src/app/committees/workspace/tabs/`)

- `SeatsWeightTab.tsx`: an `h3` "Seats & Weight", then a list labelled "Seat and weight summary" for everyone in scope:
  - "N of M seats filled" with "(full)" or "· K open";
  - "N unassigned member(s) (no seat)" when there are any (the workspace header already shows this count to everyone);
  - **Designation weight** (two decimals, or "—" while any petitioned seat has no weight), through the town roster table's `formatRollupWeight`, now exported from `CommitteeRosterTable.tsx`.
- The missing-weight warning is a sentence, with an icon that is `aria-hidden`, so it never relies on color alone. Admins see "Weight incomplete: petitioned seat 4 has no weight, so the designation weight is not shown." Leaders see the same sentence with "seat 4", without "petitioned".
- Acting Admin only (`actingPermissions`, client visibility only):
  - `seats/LtedWeightEditor.tsx`: the **LTED total weight** field and **Save LTED weight** button. It calls the unchanged `PATCH /api/committee/updateLtedWeight` (which is Admin-only on the server) with `{ committeeListId, ltedWeight }`. A blank field clears the weight (`null`). Bad input ("-5", "abc", "Infinity") shows an inline `role="alert"` message, sets `aria-invalid`, and makes no request. A server error shows "Could not save LTED weight: …" and keeps the draft. While saving, the button reads "Saving…" and is disabled. Save is also disabled when the field numerically equals the saved value. On success the tab announces "LTED weight saved." / "LTED weight cleared." in a `role="status"` and calls `onRefresh` (detail plus grid row; nothing outside `CommitteeTabProps` is used). The editor is keyed on `committee.ltedWeight`, so the field shows the server's value once the refreshed detail arrives.
  - `seats/SeatWeightBreakdown.tsx` (occupancy verification): a table captioned "Designation weight by seat" with columns Seat, Petitioned, Occupied, Seat weight, Contribution. A petitioned seat with no weight reads "Missing" / "—". The rules carry over from the old "Designation weight verification" table.
- `seats/seatsWeightDisplay.ts`: formatting only. The totals, contributions and missing seats come from the server's rollup and `designationWeightSummary`, with no client-side weight or vacancy math. `parseLtedWeightInput` validates through `updateLtedWeightSchema.shape.ltedWeight`. That schema now also has `.finite()`, so `Infinity` is rejected rather than serialized to `null`, which would clear the weight.
- **Group C:** `seatsWeightVisibility(actingPermissions)` is the one helper that decides what Leaders see. Its `showPetitionDetail` controls the per-seat Petitioned breakdown and the "petitioned" wording in the warning. Leaders get what `CommitteeSummaryBlock` showed them: vacancy, seats filled, designation weight, and which seat numbers lack a weight. They do not get the LTED weight value, the editor, or the breakdown, all of which were Admin-only in `CommitteeSelector`. Answering Group C means editing that helper.

### Glossary

- `CONTEXT.md`: added **LTED Weight** and **Designation Weight**.

### Tests

- `apps/frontend/src/__tests__/components/committees/SeatsWeightTab.test.tsx` (12) covers:
  - the summary and warning text;
  - the breakdown cells;
  - save success (PATCH body, refresh, announcement), clearing, invalid input, and the in-flight and server-error states;
  - the field re-syncing to the refreshed value;
  - the Leader read-only view;
  - `parseLtedWeightInput`.

### Not changed

- `CommitteeSelector`'s own LTED editor stays until cutover (16) deletes the old detail. In the workspace, the weight editor exists only in this tab, which removes the transition from `AddCommitteeForm` into the weight input.

