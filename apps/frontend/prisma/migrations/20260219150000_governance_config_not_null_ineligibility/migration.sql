-- Backfill any NULL values to empty array before adding constraint
UPDATE "CommitteeGovernanceConfig"
SET "nonOverridableIneligibilityReasons" = ARRAY[]::"IneligibilityReason"[]
WHERE "nonOverridableIneligibilityReasons" IS NULL;

-- Add NOT NULL constraint
ALTER TABLE "CommitteeGovernanceConfig"
ALTER COLUMN "nonOverridableIneligibilityReasons" SET NOT NULL;
