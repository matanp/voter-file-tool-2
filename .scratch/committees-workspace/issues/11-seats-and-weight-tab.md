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
  - "N unassigned member(s) (no seat)" when there are any;
  - **LTED weight** (the value, or "Not set");
  - **Designation weight** (two decimals, or "—" while any petitioned seat has no weight).
- The missing-weight warning is a sentence, with an icon that is `aria-hidden`: "Weight incomplete: petitioned seat 4 has no weight, so the designation weight is not shown." So it never relies on color alone.
- Acting Admin only (`actingPermissions`, client visibility only):
  - `seats/LtedWeightEditor.tsx`: the **LTED total weight** field and **Save LTED weight** button. It calls the unchanged `PATCH /api/committee/updateLtedWeight` (which is Admin-only on the server) with `{ committeeListId, ltedWeight }`. A blank field clears the weight (`null`). Bad input ("-5", "abc", "Infinity") shows an inline `role="alert"` message, sets `aria-invalid`, and makes no request. A server error shows "Could not save LTED weight: …" and keeps the draft. While saving, the button reads "Saving…" and is disabled. Save is also disabled when the field numerically equals the saved value. On success the tab announces "LTED weight saved." / "LTED weight cleared." in a `role="status"` and calls `onRefresh` (detail plus grid row; nothing outside `CommitteeTabProps` is used). The editor is keyed on `committee.ltedWeight`, so the field shows the server's value once the refreshed detail arrives.
  - `seats/SeatWeightBreakdown.tsx` (occupancy verification): a table captioned "Designation weight by seat" with columns Seat, Petitioned, Occupied, Seat weight, Contribution. A petitioned seat with no weight reads "Missing" / "—". The rules carry over from the old "Designation weight verification" table.
- `seats/seatsWeightDisplay.ts`: formatting only. The totals, contributions and missing seats come from the server's rollup and `designationWeightSummary`, with no client-side weight or vacancy math. `parseLtedWeightInput` mirrors `updateLtedWeightSchema`.
- **Group C:** `seatsWeightVisibility(actingPermissions)` is the one helper that decides what Leaders see. Today that is what they see now: the summary block (vacancy, filled, designation weight, missing-weight seats), without the editor or the per-seat Petitioned breakdown (both were Admin-only in `CommitteeSelector`). Answering Group C means editing that helper.

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

