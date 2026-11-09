-- Replacements use Exit Reports (leader-feedback-2026-11 ticket 09). A replacement is a
-- Submission for the candidate paired with an Exit Report on the member being replaced: the
-- outgoing member's ACTIVE row carries the report plus "replacementMembershipId", which points
-- at the candidate's SUBMITTED row. Before this, the candidate's
-- submissionMetadata.removeMemberId named the outgoing member, and acceptance always recorded
-- REMOVED / OTHER. See docs/adr/0002-exit-reports-on-the-membership-row.md.

ALTER TABLE "CommitteeMembership" ADD COLUMN "replacementMembershipId" TEXT;

-- One outgoing member per candidate.
CREATE UNIQUE INDEX "CommitteeMembership_replacementMembershipId_key"
  ON "CommitteeMembership"("replacementMembershipId");

ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_replacementMembershipId_fkey"
  FOREIGN KEY ("replacementMembershipId") REFERENCES "CommitteeMembership"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- The pairing is part of the pending report: it exists only while the outgoing member is
-- ACTIVE with a report. Every write that clears the report clears it too.
ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_replacement_only_with_exit_report"
  CHECK (
    "replacementMembershipId" IS NULL
    OR ("status" = 'ACTIVE' AND "exitReportedAt" IS NOT NULL)
  );

-- ---------------------------------------------------------------------------------------
-- Data: move pending replacements onto Exit Reports.
-- ---------------------------------------------------------------------------------------

-- Each pending candidate naming an ACTIVE member of the same committee and term. When two
-- candidates name the same member, the earlier submission is paired and the later one stays a
-- plain add (one candidate per outgoing member). A target that is no longer ACTIVE leaves the
-- submission a plain add; acceptance already refused an invalid replacement target.
CREATE TEMP TABLE "_replacement_pairs" AS
SELECT DISTINCT ON (outgoing."id")
  outgoing."id"               AS outgoing_id,
  outgoing."exitReportedAt"   AS outgoing_reported_at,
  candidate."id"              AS candidate_id,
  candidate."submittedAt"     AS submitted_at,
  candidate."submittedById"   AS submitted_by_id
FROM "CommitteeMembership" candidate
JOIN "CommitteeMembership" outgoing
  ON outgoing."voterRecordId" = btrim(candidate."submissionMetadata" ->> 'removeMemberId')
 AND outgoing."committeeListId" = candidate."committeeListId"
 AND outgoing."termId" = candidate."termId"
 AND outgoing."status" = 'ACTIVE'
 AND outgoing."id" <> candidate."id"
WHERE candidate."status" = 'SUBMITTED'
  AND jsonb_typeof(candidate."submissionMetadata") = 'object'
  AND jsonb_typeof(candidate."submissionMetadata" -> 'removeMemberId') = 'string'
  AND btrim(candidate."submissionMetadata" ->> 'removeMemberId') <> ''
ORDER BY outgoing."id", candidate."submittedAt", candidate."id";

-- No report yet: file the one acceptance used to record (REMOVED / OTHER, notes
-- "Replacement request accepted" on accept), as reported by the submitter when they submitted.
-- Other needs notes, so the report says where it came from.
UPDATE "CommitteeMembership" m
SET
  "exitReportedAt" = p.submitted_at,
  "exitReportedById" = p.submitted_by_id,
  "exitReportedKind" = 'REMOVAL',
  "resignationDateReceived" = NULL,
  "resignationMethod" = NULL,
  "removalReason" = 'OTHER',
  "removalNotes" = 'Replacement request',
  "replacementMembershipId" = p.candidate_id
FROM "_replacement_pairs" p
WHERE m."id" = p.outgoing_id
  AND p.outgoing_reported_at IS NULL;

-- A standalone report already pending (ticket 01): pair with it, leave its fields alone.
UPDATE "CommitteeMembership" m
SET "replacementMembershipId" = p.candidate_id
FROM "_replacement_pairs" p
WHERE m."id" = p.outgoing_id
  AND p.outgoing_reported_at IS NOT NULL;

-- Committee History names the member a submission would replace. It read that from the
-- candidate's current submissionMetadata and showed it on every MEMBER_SUBMITTED event for the
-- membership (a resubmission included); it now reads each submission's audit row, where new
-- submissions record it. Copy it onto every MEMBER_SUBMITTED row of such a membership that
-- lacks it, so History reads the same before and after. Every status, not only SUBMITTED:
-- accepted and rejected submissions show it too.
UPDATE "AuditLog" a
SET "metadata" = COALESCE(a."metadata", '{}'::jsonb)
  || jsonb_build_object('removeMemberId', btrim(m."submissionMetadata" ->> 'removeMemberId'))
FROM "CommitteeMembership" m
WHERE a."entityType" = 'CommitteeMembership'
  AND a."entityId" = m."id"
  AND a."action" = 'MEMBER_SUBMITTED'
  AND jsonb_typeof(m."submissionMetadata") = 'object'
  AND jsonb_typeof(m."submissionMetadata" -> 'removeMemberId') = 'string'
  AND btrim(m."submissionMetadata" ->> 'removeMemberId') <> ''
  AND (a."metadata" IS NULL OR NOT (a."metadata" ? 'removeMemberId'));

-- Pending submissions no longer carry removeMemberId: paired ones are on the outgoing row,
-- and the rest are plain adds. Other keys (requestNotes, contact, eligibilityWarnings) are
-- still read and stay. Decided rows keep theirs as a historical record nothing reads.
UPDATE "CommitteeMembership"
SET "submissionMetadata" = "submissionMetadata" - 'removeMemberId'
WHERE "status" = 'SUBMITTED'
  AND jsonb_typeof("submissionMetadata") = 'object'
  AND "submissionMetadata" ? 'removeMemberId';

DROP TABLE "_replacement_pairs";
