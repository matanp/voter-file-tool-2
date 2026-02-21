-- SRS 1.3: Set membershipType=APPOINTED for all ACTIVE CommitteeMembership records
-- that were backfilled from VoterRecord.committeeId (1.2 migration).
-- Null membershipType on ACTIVE = legacy backfill.
UPDATE "CommitteeMembership"
SET "membershipType" = 'APPOINTED'::"MembershipType"
WHERE "status" = 'ACTIVE' AND "membershipType" IS NULL;
