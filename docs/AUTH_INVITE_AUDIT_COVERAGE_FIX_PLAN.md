# Fix Plan: Complete Invite and Role-Grant Audit Coverage

Source finding: **P2 - Invite and role-grant audit coverage is incomplete**
(`docs/AUTH_INVITE_FLOW_REVIEW.md`, finding #2).

## Confirmation

Confirmed. The audit trail can reconstruct Leader **jurisdiction** grants, but not
who created or revoked an invite, and not the actual **privilege elevation** that an
invite performs. Concretely:

- The `AuditAction` enum has no invite lifecycle or privilege-grant action. The only
  invite-adjacent action is `JURISDICTION_ASSIGNED`
  (`apps/frontend/prisma/schema.prisma:58-77`).
- **Invite create** writes an `Invite` row inside a transaction with no audit
  (`apps/frontend/src/app/api/admin/invites/route.ts:157-186`).
- **Invite delete** soft-deletes an `Invite` with no audit
  (`apps/frontend/src/app/api/admin/invites/route.ts:316-322`).
- **Privilege grant** — the actual elevation — updates `User.privilegeLevel` and
  upserts `PrivilegedUser` with no audit
  (`apps/frontend/src/lib/applyPendingInvite.ts:275-284`).
- The only grant-time audit is `auditInviteJurisdictionGrants`, emitted by the apply
  route inside the transaction
  (`apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts:95-101`;
  `apps/frontend/src/lib/applyPendingInvite.ts:365-401`). It fires **only when the
  invite carries jurisdictions**, i.e. only for Leader invites. An Admin,
  RequestAccess, or ReadAccess invite acceptance currently produces **zero** audit
  events.

Net effect: the audit log records "a jurisdiction was assigned" but never "this user
was elevated to Admin via invite X, which was created by admin Y and could have been
revoked by admin Z."

## Evidence Checked

- `apps/frontend/prisma/schema.prisma:58-77` — `AuditAction` enum values.
- `apps/frontend/prisma/schema.prisma:509-526` — `AuditLog` model (`userId` is a FK to
  `User`; `beforeValue`/`afterValue`/`metadata` are JSON).
- `apps/frontend/src/app/api/admin/invites/route.ts` — create (`55-246`), delete
  (`288-335`); both gated by `withPrivilege(PrivilegeLevel.Admin, ...)` (`338-344`).
- `apps/frontend/src/lib/applyPendingInvite.ts` — `grantInvite` (`235-312`),
  `auditInviteJurisdictionGrants` (`365-401`).
- `apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts:83-105` — grant runs
  in a `prisma.$transaction`; jurisdiction audit is emitted inside it on `applied`.
- `apps/frontend/src/lib/auditLog.ts` — `logAuditEvent` (best-effort) and
  `logAuditEventOrThrow` (fail-closed); both accept a transaction `client`.
- `apps/frontend/src/app/api/lib/withPrivilege.ts:41-53` — `session.user.privilegeLevel`
  is guaranteed present for privilege-gated handlers.
- Precedent for adding an enum value:
  `apps/frontend/prisma/migrations/20260224113000_add_governance_config_updated_audit_action/migration.sql`
  (`ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GOVERNANCE_CONFIG_UPDATED';`).

## Target Audit Coverage

Three new `AuditAction` values and events:

| Action | Actor (`userId`/`userRole`) | `entityType` / `entityId` | before → after | Key metadata |
| --- | --- | --- | --- | --- |
| `INVITE_CREATED` | creating admin (`session.user.id` / `session.user.privilegeLevel`) | `Invite` / invite id | `null` → invite snapshot | `email`, `privilegeLevel`, `jurisdictions`, `expiresAt` |
| `INVITE_DELETED` | deleting admin (`session.user.id` / `session.user.privilegeLevel`) | `Invite` / invite id | invite snapshot → `{ deleted: true }` | `email`, `privilegeLevel`, `wasUsed` (`usedAt != null`) |
| `PRIVILEGE_GRANTED` | authorizing admin (`invite.createdBy` / inviter role) | `User` / grantee `userId` | `{ privilegeLevel: prior }` → `{ privilegeLevel: granted }` | `inviteId`, `email`, `source: "invite"`, `granteeUserId` |

### Design decisions

1. **Attribution of `PRIVILEGE_GRANTED` → the inviter, not the grantee.** Mirror
   `auditInviteJurisdictionGrants`: `userId = invite.createdBy`, `userRole =` the
   inviter's current role, grantee recorded in metadata. Rationale: the grantee did
   not authorize their own elevation; the admin who issued the invite did. This keeps
   the privilege event and the jurisdiction event attributed to the same actor for a
   single acceptance. Factor the existing inviter-role lookup
   (`applyPendingInvite.ts:375-379`) into a shared `getInviterRole(client, createdBy)`
   helper (fallback `PrivilegeLevel.Admin` when the inviter row is missing) and reuse
   it for both events.

2. **Emit `PRIVILEGE_GRANTED` inside `grantInvite`, using the passed `client`.** This
   guarantees it is written in the same transaction as the `User.update` /
   `PrivilegedUser.upsert` and only on the real `applied` transition
   (`consumeResult.count > 0`). Emitting it in the route instead would (a) split it
   from the state change and (b) miss any non-route caller of `applyPendingInvite`.
   The `already_applied` path must **not** emit a second event (idempotent re-accept).

3. **Fail-closed, in-transaction, for all three.** Access-control provenance is
   compliance-critical, so use `logAuditEventOrThrow` with the transaction `client`,
   matching the jurisdiction-grant pattern. A failed audit insert rolls back the
   invite create / delete / grant. Trade-off: an `AuditLog` outage blocks invite
   management and acceptance — acceptable and intended for an access-control audit
   trail; called out here so it is a conscious choice.

## Implementation Plan

1. **Schema + migration.**
   - Add `INVITE_CREATED`, `INVITE_DELETED`, `PRIVILEGE_GRANTED` to the `AuditAction`
     enum in `apps/frontend/prisma/schema.prisma`.
   - Create a migration directory (e.g.
     `apps/frontend/prisma/migrations/<timestamp>_add_invite_audit_actions/migration.sql`)
     with one `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS '<VALUE>';` per value,
     following the `20260224113000` precedent.
   - Regenerate the Prisma client so the new enum members type-check.

2. **`INVITE_CREATED`** in `createInviteHandler`
   (`apps/frontend/src/app/api/admin/invites/route.ts`). Inside the existing
   `prisma.$transaction`, capture the created invite and audit before returning it:
   ```ts
   const created = await tx.invite.create({ /* unchanged */ });
   await logAuditEventOrThrow(
     createdById,
     session.user.privilegeLevel,
     AuditAction.INVITE_CREATED,
     "Invite",
     created.id,
     null,
     { email, privilegeLevel, expiresAt, jurisdictions: dedupedJurisdictions },
     { inviteId: created.id },
     tx,
   );
   return created;
   ```
   (`session.user.privilegeLevel` is guaranteed by the `Admin` gate.)

3. **`INVITE_DELETED`** in `deleteInviteHandler` (same file). Wrap the fetch + soft
   delete in a `prisma.$transaction`, then audit with a `before` snapshot so
   revoked-before-use vs. revoked-after-use is visible:
   ```ts
   await prisma.$transaction(async (tx) => {
     const invite = await tx.invite.findUnique({ where: { id: inviteId } });
     if (!invite) throw new NotFound(); // preserve the existing 404 path
     await tx.invite.update({ where: { id: inviteId }, data: { deleted: true, deletedAt: new Date() } });
     await logAuditEventOrThrow(
       session.user.id, session.user.privilegeLevel,
       AuditAction.INVITE_DELETED, "Invite", inviteId,
       { email: invite.email, privilegeLevel: invite.privilegeLevel, wasUsed: invite.usedAt != null },
       { deleted: true },
       { inviteId }, tx,
     );
   });
   ```
   Keep the current 404-when-missing and 400-when-no-id responses intact.

4. **`PRIVILEGE_GRANTED`** in `grantInvite`
   (`apps/frontend/src/lib/applyPendingInvite.ts`). Read the grantee's prior
   `privilegeLevel` before the `User.update`, then after the update/upsert emit the
   event with the shared inviter-role helper:
   ```ts
   const prior = await client.user.findUnique({ where: { id: userId }, select: { privilegeLevel: true } });
   // ...existing user.update + privilegedUser.upsert...
   const inviterRole = await getInviterRole(client, invite.createdBy);
   await logAuditEventOrThrow(
     invite.createdBy, inviterRole,
     AuditAction.PRIVILEGE_GRANTED, "User", userId,
     { privilegeLevel: prior?.privilegeLevel ?? null },
     { privilegeLevel: invite.privilegeLevel },
     { inviteId: invite.id, email, source: "invite", granteeUserId: userId },
     client,
   );
   ```
   Refactor `auditInviteJurisdictionGrants` to reuse `getInviterRole`. Do not touch
   the `already_applied` / `no_invite` paths — they must remain audit-silent.

5. **Tests** (extend `apps/frontend/src/__tests__/api/auth/invite-route.test.ts` and
   `apps/frontend/src/__tests__/lib/applyPendingInvite.test.ts`, plus an admin-invites
   route test):
   - Invite create writes one `INVITE_CREATED` with correct actor, entity id, and
     metadata (including jurisdictions for a Leader invite).
   - Invite delete writes one `INVITE_DELETED` with a `before` snapshot and `wasUsed`.
   - Applying a **non-Leader** invite (e.g. Admin) writes exactly one
     `PRIVILEGE_GRANTED` with `before`/`after` levels and inviter attribution, and
     zero `JURISDICTION_ASSIGNED` — proving the previously-silent path is now covered.
   - Applying a Leader invite writes `PRIVILEGE_GRANTED` **and**
     `JURISDICTION_ASSIGNED`, both attributed to `createdBy`.
   - Re-applying an already-used invite (`already_applied`) writes **no** additional
     `PRIVILEGE_GRANTED`.
   - Fail-closed: a forced `AuditLog` insert failure rolls back the invite
     create / delete / grant (no orphaned `Invite`, `User.privilegeLevel`, or
     `PrivilegedUser` change).

6. **Verification.**
   - `pnpm --filter voter-file-tool test -- --runTestsByPath src/__tests__/api/auth/invite-route.test.ts src/__tests__/lib/applyPendingInvite.test.ts` (plus the new admin-invites test path).
   - `pnpm run check:api-routes`.
   - Typecheck / `prisma generate` to confirm the enum members resolve.

## Risks / Edge Cases

- **Postgres enum migration.** `ALTER TYPE ... ADD VALUE` follows the existing
  precedent and uses `IF NOT EXISTS` for idempotency. Deploy the migration before the
  code that references the new values; the enum members must exist in the DB at
  runtime.
- **Deleted inviter FK.** `PRIVILEGE_GRANTED` sets `AuditLog.userId = invite.createdBy`.
  If that admin's `User` row was deleted, the FK insert fails — the same latent risk
  already present in `auditInviteJurisdictionGrants`. Note it; if it needs hardening,
  do it in one place (the shared helper), e.g. fall back to `SYSTEM_USER_ID` when the
  inviter row is gone, and record the original `createdBy` in metadata. Out of scope
  to change existing behavior, but the shared helper is the right seam.
- **Newly non-silent paths.** Admin/RequestAccess/ReadAccess invite acceptance now
  writes an event where it previously wrote none — intended, and the reason this
  finding exists.
- **Idempotency.** `PRIVILEGE_GRANTED` must fire only on the `applied` transition;
  `grantInvite` already reaches the grant block only when `consumeResult.count > 0`,
  so no extra guard is required — but the re-apply test locks this in.
- **Fail-closed blast radius.** An `AuditLog` write failure now blocks invite
  create/delete/accept. This is the intended posture for an access-control trail;
  monitor `AuditLog` availability accordingly.

## Out of Scope (tracked elsewhere)

- Email canonicalization (finding #1) — separate fix.
- Broader negative-path test suite (finding #3) — the tests above cover only the
  audit-coverage slice.
- Auditing non-invite privilege changes (e.g. `loadAdmin` promoting developer emails,
  `bulkLoadCommittees`). The reusable `PRIVILEGE_GRANTED` action and `getInviterRole`
  seam make that a natural follow-up, but it is not part of this finding.
