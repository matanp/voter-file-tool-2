# Profile sheet: jurisdiction picker when acting as Leader; GlobalContext mirrors server

Status: ready-for-agent
Type: task
Blocked by: 01, 02
Do first or concurrently: ../../glossary-alignment/01-acting-privilege-rename.md

## Goal

Let a Developer pick a role **and**, when the role is Leader, one or more jurisdictions, from the
existing profile sheet — and make the client context reflect the server's acting state rather than
being the source of truth.

## Work

1. **`GlobalContext`** (`apps/frontend/src/components/providers/GlobalContext.tsx`)
   - Context value becomes `{ acting: ActingState | null, setActing(state | null): Promise<void> }`.
     Keep a derived `actingPrivilege: PrivilegeLevel` (= `acting?.privilegeLevel ?? real`) so the
     ~16 existing consumers need only the glossary rename, not a shape change.
   - On mount (Developer only): `GET /api/developer/acting` and hydrate. Fall back to
     `localStorage` only to pre-fill the picker, never to set behaviour.
   - `setActing` → `PUT`/`DELETE /api/developer/acting`, then `router.refresh()` so Server
     Components re-render with the new cookie, then update state.
   - **localStorage key**: this is the moment to resolve the open question in the rename ticket.
     Recommendation: new key `actingPrivilege`, JSON `ActingState`, read old `actingPermissions`
     once as a fallback to seed `privilegeLevel`, then delete it.
2. **Profile sheet** (`apps/frontend/src/components/ui/manageProfile.tsx`)
   - Keep the role `ComboboxDropdown`.
   - When the chosen role is `Leader`, show a jurisdiction picker: city/town select (from
     `dropdownLists.city` or `/api/fetchCommitteeList` distinct `cityTown` for the active term) and
     an optional leg-district select; "Add" appends a `{cityTown, legDistrict}` chip; chips are
     removable. Reuse `jurisdictionLabel` from `~/lib/invites/display` for chip text.
   - Show a "Clear acting" button that `DELETE`s.
   - Show the active acting state as a compact summary line ("Acting as Leader — Brighton LD 3,
     Henrietta (all districts)").
3. **`CommitteeSelector.tsx:172`** — the `enabled: actingPermissions === Leader` query is now
   correct without change (02 makes the endpoint acting-aware). Verify; no edit expected.

## Done when

- A Developer can choose Leader + jurisdictions in the sheet, and `/committees` immediately
  reflects it after the refresh.
- Choosing any non-Leader role clears jurisdictions (the schema rejects them otherwise).
- Reloading the browser keeps the acting state (cookie), and the picker is pre-filled.
- No consumer reads `localStorage` to decide behaviour.

## Comments

- 2026-11-22 — PR #186 (glossary-alignment 01) renamed the client identifiers to
  `actingPrivilege` / `setActingPrivilege` / `hasPrivilegeFor`; references to `actingPermissions`
  above now mean `actingPrivilege`. The storage key stayed `"actingPermissions"`, held in
  `ACTING_PRIVILEGE_STORAGE_KEY` in `GlobalContext.tsx` and pinned by
  `__tests__/components/providers/GlobalContext.test.tsx`. When this ticket changes the key, also
  update `apps/frontend/.claude/skills/run-frontend/steps/record-search-committee-badge.mjs:42`,
  which writes the literal `'actingPermissions'` instead of using the constant.
