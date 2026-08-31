# 05 - `privilegeLevel ?? PrivilegeLevel.Admin` fallback in audit calls is a silent role lie

Status: needs-triage

Noted during the branch review of `feat/bulk-add-election-config` (2026-08-30). Not a bug
on this branch — filed because the branch copied the pattern into six more call sites.

Every audit call on the election-config routes passes the actor's role as:

```ts
session.user.privilegeLevel ?? PrivilegeLevel.Admin
```

`withPrivilege` already 500s when `privilegeLevel` is missing on a `PrivilegeLevel`-gated
route, so the fallback is unreachable from those handlers today. The concern is what it
records if that ever stops being true: `AuditLog.userRole` is the actor's role at the time
of the action, and this writes `Admin` for an actor whose role we could not read. An audit
row that invents a privilege level is worse than one that fails to write, and the
fail-open `logAuditEvent` path means the alternative (throwing) costs nothing operationally.

Existing precedent: `src/app/api/admin/crosswalk/import/route.ts:171` does the same, which
is why the new routes match it. Changing one without the other would leave two conventions.

Sites (all `apps/frontend/src`):

- `app/api/admin/officeNames/route.ts`, `officeNames/[id]/route.ts`, `officeNames/bulk/route.ts`
- `app/api/admin/electionDates/route.ts`, `electionDates/[id]/route.ts`, `electionDates/bulk/route.ts`
- `app/api/admin/crosswalk/import/route.ts` (pre-existing)

Options, roughly in order of preference:

1. Have `withPrivilege` narrow `SessionWithUser` so `privilegeLevel` is non-nullable on
   `PrivilegeLevel`-gated routes. The fallback then fails to typecheck and every site drops
   it. Fixes the class, not the instances.
2. Keep the fallback but make it honest — a `UNKNOWN`/`System` role value rather than
   `Admin`. Needs an enum addition and a migration.
3. Leave as-is and accept that the branch is consistent with existing code.

Blocked on nothing; it is a small call about which of the three we want.
