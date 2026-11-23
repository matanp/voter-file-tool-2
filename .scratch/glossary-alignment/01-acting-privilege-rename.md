# Rename acting-permission identifiers to acting-privilege

Status: resolved
Resolution: identifiers renamed; localStorage key kept as "actingPermissions" (option 1); done on refactor/glossary-privilege-jurisdiction.

## Why

`CONTEXT.md` makes **Privilege** the canonical word and lists `permission` and `role` under
`_Avoid_`. The server side already agrees (`PrivilegeLevel`, `privilegeLevel`, `withPrivilege`,
`PrivilegedUser`). The client side does not.

`skills/auth-check-patterns/SKILL.md` also already calls this concept "acting privilege" in its
own prose while the code it governs calls it `actingPermissions` — so the doc and the identifier
disagree today, independently of the glossary.

## What to rename

| From | To |
| --- | --- |
| `actingPermissions` | `actingPrivilege` |
| `setActingPermissions` | `setActingPrivilege` |
| `hasPermissionFor` | `hasPrivilegeFor` |
| `HasPermissionForFn` | `HasPrivilegeForFn` |

Scale, as of 2026-08-29 (`apps/frontend/src`):

- `actingPermissions` — 50 occurrences across 16 files
- `hasPermissionFor` — 76 occurrences across 30 files

Definition sites:

- `src/components/providers/GlobalContext.tsx` — context type, default, and `useState`
- `src/lib/utils.ts:31` — `hasPermissionFor`
- `src/__tests__/types/global.d.ts:10,12` — test type alias

## Watch out

**The localStorage key is part of this.** `GlobalContext.tsx:27,44` read and write the literal
string `"actingPermissions"`. Renaming the key silently discards every Developer's saved
simulation state on next load. Either:

1. Keep the storage key as `"actingPermissions"` and rename only the identifiers (simplest,
   leaves one lie in the code), or
2. Rename the key and read the old key once as a fallback, writing the new one.

Pick one deliberately; don't rename the key by find-and-replace.

## Done when

- No `actingPermissions` / `hasPermissionFor` identifiers remain in `apps/frontend/src`
- The localStorage decision above is made and, if option 2, the fallback read exists
- `skills/auth-check-patterns/SKILL.md` code samples updated to match
- Typecheck and tests pass; no behaviour change

## Comments

- 2026-09-19 — `.scratch/developer-acting-as/` (option 2: server-readable acting state with
  jurisdictions) depends on this rename landing first or concurrently. Its ticket 03 changes the
  localStorage payload from a bare enum string to a JSON `ActingState`, so if you choose option 2
  above (rename the key with a one-time fallback read), coordinate the key name with that ticket
  (`actingPrivilege`) rather than picking independently.
- 2026-11-21 — Resolved. Renamed `actingPermissions` → `actingPrivilege`, `setActingPermissions` →
  `setActingPrivilege`, `hasPermissionFor` → `hasPrivilegeFor`, `HasPermissionForFn` →
  `HasPrivilegeForFn` across `apps/frontend/src`, plus the derived names that embed them
  (`mockHasPrivilegeFor` global, `realHasPrivilegeFor`, `mockActingPrivilege`,
  `cachedActingPrivilege`, `handleSetActingPrivilege`) and `hasPrivilegeFor`'s parameters.
  **localStorage: option 1.** The key stays `"actingPermissions"`, held in
  `ACTING_PRIVILEGE_STORAGE_KEY` in `GlobalContext.tsx` with a one-line comment saying why;
  `__tests__/components/providers/GlobalContext.test.tsx` pins it. If
  `.scratch/developer-acting-as/` ticket 03 later changes the payload to JSON, that is the moment
  to move to a new key with a fallback read. Updated `skills/auth-check-patterns/SKILL.md` (samples
  and prose, and it now names the legacy key), `skills/adding-reports/SKILL.md`,
  `scripts/review/run-scans.sh`, `jest.setup.ts`, `__tests__/README.md` and the run-frontend
  REFERENCE. Left as-is: historical docs and `.scratch` records, and test helpers outside the
  rename table (`mockHasPermission`, `renderWithPermissions`, `mockRealPermissionHierarchy`).
- 2026-11-22 — Rebased onto main (conflicts in `header.tsx` and `manageProfile.tsx`; new
  `Header.test.tsx` and `ScopedReportForm.test.tsx` code from main renamed too). Test helpers now
  renamed as well: `mockHasPermission` → `mockHasPrivilege`, `mockRealPermissionHierarchy` →
  `mockRealPrivilegeHierarchy`, `renderWithPermissions` → `renderWithActingPrivilege`,
  `AuthTestCase.hasPermission` → `hasPrivilege`, and "acting permissions" in comments and test
  names. Dropped the rename history from the SKILL.md storage-key note. Remaining "permission"
  in `apps/frontend/src` is the storage key, user-facing copy ("You do not have permission"), and
  `const permissions = await auth()` session variables. tsc clean, lint 0 errors, jest 167
  suites / 2336 tests pass.
- 2026-11-22 — Merged as #186 (`ccf8e1dd`) after a second rebase onto main (#185 had landed;
  jest 167 suites / 2349 tests). #183 merged 49 seconds later; it had branched before this rename
  and added test code using the old names (`actingPermissions` / `setActingPermissions` in
  `CommitteeActionDrawer.test.tsx`, `mockHasPermission` in `requestAdd.test.ts`). Git merged it
  cleanly, but tsc fails on those names and `next build` typechecks the tests (`tsconfig.json`
  includes `**/*.ts(x)`). The production deploy of `0313e4d7` failed; the Vercel logs weren't
  read, so the cause is inferred. #196 fixed the names. Lesson for future renames: after merging,
  re-grep main for the old names if other PRs merged alongside.
  Prod QA on deploy 7988255539 (`0e01dd49`), as a Developer, read-only: setting acting privilege
  to ReadAccess hides the Admin tab and persists under the `actingPermissions` key across a reload;
  Admin and Leader behave as expected; the original state (no saved key) was restored. Home,
  committees workspace, record search, six admin pages and the reports hub render with no console
  errors; no new Sentry or PostHog issues since the deploy. One Committee Roster report (CLARKSON,
  XLSX) was generated for QA and left in My Reports for the maintainer to delete.
