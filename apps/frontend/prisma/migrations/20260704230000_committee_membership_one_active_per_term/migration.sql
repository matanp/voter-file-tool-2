-- Enforce at most one ACTIVE CommitteeMembership per voter per term.
-- Prevents cross-route races that leave a voter ACTIVE in two committees.
CREATE UNIQUE INDEX "CommitteeMembership_voterRecordId_termId_active_key"
ON "CommitteeMembership"("voterRecordId", "termId")
WHERE "status" = 'ACTIVE';
