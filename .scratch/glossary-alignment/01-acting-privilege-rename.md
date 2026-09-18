# Rename acting-permission identifiers to acting-privilege

Status: ready-for-agent

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
