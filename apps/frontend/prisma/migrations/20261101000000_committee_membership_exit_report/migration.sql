-- Exit Reports: a Leader reports that a member resigned or should be removed, and an Admin
-- confirms or rejects it. The report lives on the outgoing member's ACTIVE row (the three
-- exitReported* columns plus the existing four exit fields), not in a new status or table.
-- See docs/adr/0002-exit-reports-on-the-membership-row.md.

CREATE TYPE "ExitReportKind" AS ENUM ('RESIGNATION', 'REMOVAL');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMBER_EXIT_REPORTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMBER_EXIT_REPORT_REJECTED';

ALTER TABLE "CommitteeMembership"
  ADD COLUMN "exitReportedAt" TIMESTAMP(3),
  ADD COLUMN "exitReportedById" TEXT,
  ADD COLUMN "exitReportedKind" "ExitReportKind";

ALTER TABLE "CommitteeGovernanceConfig" ADD COLUMN "exitReportInstructions" TEXT;

ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_exitReportedById_fkey"
  FOREIGN KEY ("exitReportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backstop for writeMembershipExit: a write that moves a row out of ACTIVE without clearing
-- the report fails here instead of leaving a stale report behind. Prisma does not model
-- CHECK constraints; the schema carries a NOTE pointing here.
ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_exit_report_only_while_active"
  CHECK ("exitReportedAt" IS NULL OR "status" = 'ACTIVE');

ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_exit_report_kind_with_reported_at"
  CHECK (("exitReportedAt" IS NULL) = ("exitReportedKind" IS NULL));
