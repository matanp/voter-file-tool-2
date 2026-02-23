-- SRS 4.4: remove dead PETITIONED_WON lifecycle state.
-- Any historical PETITIONED_WON rows are canonicalized to ACTIVE.

ALTER TYPE "MembershipStatus" RENAME TO "MembershipStatus_old";

CREATE TYPE "MembershipStatus" AS ENUM (
  'SUBMITTED',
  'REJECTED',
  'CONFIRMED',
  'ACTIVE',
  'RESIGNED',
  'REMOVED',
  'PETITIONED_LOST',
  'PETITIONED_TIE'
);

ALTER TABLE "CommitteeMembership"
ALTER COLUMN "status" TYPE "MembershipStatus"
USING (
  CASE
    WHEN "status"::text = 'PETITIONED_WON' THEN 'ACTIVE'::text
    ELSE "status"::text
  END
)::"MembershipStatus";

DROP TYPE "MembershipStatus_old";
