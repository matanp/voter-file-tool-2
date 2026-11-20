# Thread resolved privilege + jurisdictions through jurisdiction-scoped server paths

Status: ready-for-agent
Type: task
Blocked by: 01

## Goal

Every server path that branches on privilege for *behaviour* (scoping, defaults, which query runs)
uses the resolved acting privilege. Every path that branches for *authorization* keeps real
privilege.

## Work

Consumers (all of `getUserJurisdictions` / `validateReportJurisdictionAccess` plus the direct
`privilegeLevel` branches):

- `apps/frontend/src/app/api/lib/committeeValidation.ts`
  - `getUserJurisdictions(userId, termId, privilegeLevel, acting?)`: when
    `acting?.privilegeLevel === Leader`, return `acting.jurisdictions` mapped to the
    `UserJurisdiction`-compatible shape (or narrow the return type to `JurisdictionScope[]`; see
    `../../glossary-alignment/02-jurisdiction-scope-type-rename.md`) without hitting the DB.
    Admin/Developer → `null` as today, but evaluated on the **resolved** privilege.
  - `validateReportJurisdictionAccess`: accept `acting` and pass it down; `isAdmin` computed from
    resolved privilege.
- `apps/frontend/src/app/api/user/jurisdictions/route.ts` — return `acting.jurisdictions` (with a
  synthetic `term.label` from the active term) when acting as Leader.
- `apps/frontend/src/app/committees/page.tsx` — call `resolveActing()` after `auth()`; use the
  resolved privilege for the Leader filter (`:36`), `initialScope` (`:54`), and `isAdminUser`.
  Keep `prisma.committeeMembership.count` gated on resolved `isAdminUser` too (it's display, not
  data protection).
- `api/committee/roster/route.ts`, `api/committee/requestAdd/route.ts`,
  `api/committee/designationWeight/route.ts`, `api/fetchCommitteeList/route.ts`,
  `api/generateReport/route.ts` — replace `session.user.privilegeLevel` reads that drive scoping
  or Leader branches (e.g. `requestAdd/route.ts:62,125`) with the resolved value. Leave the
  `withPrivilege(...)` wrapper levels untouched.

Rule of thumb while editing: if removing the line would let a real Leader do something they
shouldn't, it is authorization — keep real privilege. Otherwise it is behaviour — use resolved.

## Done when

- A Developer with acting `{Leader, [{cityTown:"X", legDistrict:3}]}` sees only X/LD3 committees
  on `/committees`, lands directly on that roster (single-scope), and gets "You do not have access
  to the requested jurisdiction" when requesting a sign-in sheet for another town.
- A Developer with acting `{Leader, []}` sees the "No Committee Access" state — now for the right
  reason.
- Clearing the acting state restores full Developer behaviour with no reload beyond a router refresh.
- Real Leader / Admin / ReadAccess behaviour is byte-for-byte unchanged (existing tests pass).
