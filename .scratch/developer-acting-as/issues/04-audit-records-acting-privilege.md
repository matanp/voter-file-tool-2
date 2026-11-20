# Audit payload: record acting privilege alongside real identity

Status: ready-for-agent
Type: task
Blocked by: 02

## Goal

When a Developer mutates data while acting as another role, the audit trail must show both who
really did it and what role they were simulating — so a test-run "Leader added a member" is not
mistaken for a real Leader action, and so a Developer cannot hide behind a simulated role.

## Work

- `apps/frontend/src/lib/auditLog.ts` (`logAuditEventOrThrow`): add optional `actingPrivilege?:
  PrivilegeLevel` and `actingJurisdictions?: JurisdictionScope[]` to the payload/metadata JSON.
  `userId`/`userRole` stay the **real** values.
- Call sites that pass `userRole` (e.g. `api/committee/requestAdd/route.ts:285`) pass
  `session.acting` through.
- `apps/frontend/src/app/admin/audit/auditUtils.ts` — render "Developer (acting as Leader)" in the
  role column when present.

## Done when

- An audit row produced while acting shows real role `Developer` and `actingPrivilege: Leader`.
- Rows produced by real users have no acting fields.
- `auditUtils.test.ts` covers the new rendering.
