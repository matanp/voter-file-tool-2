-- Resignation Letters (leader-feedback-2026-11 ticket 08): one optional file per resignation,
-- stored in R2 under resignation-letters/<membershipId>/ and referenced from the membership row.
-- See docs/adr/0002-exit-reports-on-the-membership-row.md.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESIGNATION_LETTER_ATTACHED';

ALTER TABLE "CommitteeMembership"
  ADD COLUMN "resignationLetterKey" TEXT,
  ADD COLUMN "resignationLetterContentType" TEXT,
  ADD COLUMN "resignationLetterFileName" TEXT;

-- A letter belongs to a resignation: the recorded one (RESIGNED) or a pending resignation
-- Exit Report (ACTIVE with exitReportedKind = 'RESIGNATION'). A path that changes the row
-- without clearing the letter fails here instead of leaving it attached to the wrong state.
ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_resignation_letter_only_on_resignation"
  CHECK (
    "resignationLetterKey" IS NULL
    OR "status" = 'RESIGNED'
    OR ("status" = 'ACTIVE' AND "exitReportedKind" IS NOT DISTINCT FROM 'RESIGNATION')
  );

ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_resignation_letter_fields_together"
  CHECK (
    ("resignationLetterKey" IS NULL) = ("resignationLetterContentType" IS NULL)
    AND ("resignationLetterKey" IS NULL) = ("resignationLetterFileName" IS NULL)
  );
