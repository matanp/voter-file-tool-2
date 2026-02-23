-- Allow historical repeats for confirmed/dismissed flags while keeping one pending flag per reason.
DROP INDEX IF EXISTS "EligibilityFlag_membershipId_reason_status_key";

CREATE UNIQUE INDEX "EligibilityFlag_membershipId_reason_pending_key"
ON "EligibilityFlag"("membershipId", "reason")
WHERE "status" = 'PENDING';
