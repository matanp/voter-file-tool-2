# 09 - Roster tab

Type: task
Status: resolved
Blocked by: 08
Parent: ../map.md

## Question

Execute plan §7.1: the seat table as the primary roster representation, reusing and extending `CommitteeRosterTable.tsx`. Columns: seat number, member or vacancy state, membership type, contact info when authorized (Admin-only, plan §3.10), petitioned-vacancy distinction, and a row action menu offering add-from-vacant-row, replace, record resignation, administrative removal.

The row actions dispatch `CommitteeAction` objects (plan §8 type) to the workspace; they must not open anything themselves, since the drawer is ticket 13. Until 13 lands, the actions are wired to a no-op or the existing dialogs — say which in the answer. Role gating follows `auth-check-patterns`.

## Answer

Built on branch `wave2-09` (from `committees-workspace` after 07, 08 and LPV-01).

### What changed

- `committees/CommitteeRosterTable.tsx`: still exports `CommitteeRosterTable` (the town roster that `CommitteeSelector` uses), with unchanged behavior. It now also exports `CommitteeSeatTable { rows, isAdmin, label, renderRowActions? }`, the single-committee table. The two share the row renderer (`SeatRow`, which now has optional ED and Actions cells) and the seated-then-unassigned ordering. The seat table's columns are Seat, Member (name or vacancy state), Type, Contact (Admin-only) and an Actions column that is present only when some row has an action. It has no ED column or rollup header, because the committee is the scope. `Table`'s own `overflow-auto` wrapper keeps wide content scrolling inside the tab. The file was also reformatted with Prettier, since the old body indentation was off.
- `workspace/tabs/RosterTab.tsx`: an `h3` **Roster**, the seat table labelled `Seats for {town} LD {n} ED {n}`, and an empty state ("This committee has no seats or members yet."). It accepts an optional `onAction` beyond `CommitteeTabProps`. That keeps it assignable to the registry's `ComponentType<CommitteeTabProps>`, and `types.ts` and the registry are not edited.
- `workspace/tabs/roster/seatPetitionDisplay.ts`: the **one helper** for petition display. `seatPetitionDisplay(row)` returns `{ membershipTypeLabel, vacancyLabel, petitionedVacant }`, and both tables render Petitioned/Appointed and the petitioned-vacancy marker only through it. When LPV-01 group C is answered, the change is one edit there (for example, passing the acting privilege and collapsing the distinction for Leaders). A petitioned vacancy is shown in text ("— petitioned vacant —"), and the amber highlight is in addition to the text, never the only signal.
- `workspace/tabs/roster/rowActions.ts`: holds the action-intent type and the role gating (see below).
- `workspace/tabs/roster/RosterRowActionMenu.tsx`: a Radix dropdown on an icon button named `Actions for seat N` (or `Actions for {name}` on an unassigned row). Choosing an item only calls `onAction(item.action)`.

### Action-intent type

`RosterRowAction` (in `rowActions.ts`) is **identical to plan §8's `CommitteeAction`**:

```ts
type RosterCommitteeRef = { committeeListId; cityTown; legDistrict; electionDistrict };
type RosterRowAction =
  | { kind: "add-member"; committee: RosterCommitteeRef; seatNumber?: number }
  | { kind: "replace-member"; committee: RosterCommitteeRef; memberId: string }
  | { kind: "remove-member"; committee: RosterCommitteeRef; memberId: string }
  | { kind: "record-resignation"; committee: RosterCommitteeRef; memberId: string };
```

`memberId` is the occupant's VRCNUM, which is what `/api/committee/remove` and `requestAdd`'s replacement target use today. `committee` comes from `detail.committee` via `committeeRefFrom`. Ticket 13 can make it an alias of `CommitteeAction` (or delete it and import `CommitteeAction`), and no producer changes.

### Role gating (acting privilege, client visibility only)

`rosterRowActions(row, committee, actingPermissions)` decides what each row offers:

| Row | Admin / Developer | Leader / RequestAccess | ReadAccess |
|---|---|---|---|
| Vacant seat | **Add member** (`add-member`, seatNumber) | **Submit candidate** (`add-member`, seatNumber) | — |
| Seated or unassigned member | **Record resignation**, **Remove member** | **Replace member** (`replace-member`) | — |

Replace is not offered to Admin (plan §8 "Replacement in v1"). The menu for Leader and RequestAccess follows plan §8 pending ticket 03. Note that today's `/committees` shows "Remove or Replace" only to `RequestAccess`, not to Leader. If 03 retires RequestAccess, only the `canSubmit` threshold in `rowActions.ts` changes. ReadAccess gets no menu and no Actions column.

Contact is shown only when `hasPermissionFor(actingPermissions, Admin)` holds and the detail carries `contact`. A Developer acting as Leader therefore does not see contact, even though the server sent it to them.

### Wiring choice: no-op

Until 13, `RosterTab`'s `onAction` defaults to a no-op, and nothing passes it. The existing resignation and removal dialogs, and the `CommitteeRequestForm` replace flow, are inline state in `CommitteeSelector.tsx`. Reusing them would mean extracting them from that file, and possibly editing `CommitteeTabs`, both of which are outside this ticket. That migration is ticket 14's job. The menus are present and role-gated, and selecting an item closes the menu and does nothing else.

### Tests

`apps/frontend/src/__tests__/components/committees/RosterTab.test.tsx` (15 tests) renders `RosterTab` directly under `GlobalContext`:

- Seat order, then unassigned; vacancy and petitioned-vacancy text plus the highlight; no ED column; the empty state.
- Contact: shown to Admin; absent for Leader; hidden from a Developer acting as Leader even when the detail carries contact; no column when no row carries it.
- Actions: Admin, Developer, Leader, RequestAccess and ReadAccess menus. Exact dispatched objects (`add-member` with seatNumber, `record-resignation`, `remove-member`, `replace-member` with the VRCNUM and the composite-key ref). Nothing opens a dialog. With no handler, an action is a no-op.

`CommitteeRosterTable.test.tsx` passes unchanged, as do the workspace tests, including the `h3` **Roster** check.

## Comments

**Gate (2026-10-09).**

- `test`: 116 suites / 1568 tests. 2 suites (9 tests) fail: the known pre-existing `committeeDiscrepancyMembershipType` and `CommitteeRequestForm.preflight`. Nothing else fails.
- `lint`: 0 errors, plus 12 pre-existing warnings in files this ticket does not touch.
- `build`: passes. The only warning is the third-party `keyv` one.
- `check:api-routes`: passed (70 methods / 60 files).
- Not checked in a browser: the 375px fit of the table with the Actions column, and the dropdown's placement inside the pane's scroll container. Ticket 15 covers both.

**Notes for 13/14.**

- 13: add `onAction` (typed `CommitteeAction`) to `CommitteeTabProps` and pass it from `CommitteeTabs`. `RosterTab` already accepts `onAction` with the same shape, so delete the local `RosterTabProps` extension and make `RosterRowAction` an alias of `CommitteeAction`. The drawer picks `add` vs `requestAdd` from the role. The menu label ("Add member" vs "Submit candidate") is already role-appropriate.
- 14: `record-resignation` and `remove-member` are already dispatched for Admin on seated *and* unassigned members. `replace-member` is dispatched for Leader and RequestAccess on both.
- Group C: change only `seatPetitionDisplay.ts`.
