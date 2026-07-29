-- Enforce at most one pending (unused, non-deleted) invite per email.
-- Expired-but-not-deleted rows are cleaned up in POST /api/admin/invites before create.
--
-- SCHEMA DRIFT: This index is NOT in schema.prisma — Prisma 5.15 does not support
-- partial indexes (WHERE clause). See Invite model comment in schema.prisma.
CREATE UNIQUE INDEX "Invite_email_pending_key"
ON "Invite"("email")
WHERE "usedAt" IS NULL AND "deleted" = false;
