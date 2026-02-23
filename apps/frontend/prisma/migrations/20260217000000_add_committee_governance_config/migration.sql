-- CreateEnum
CREATE TYPE "IneligibilityReason" AS ENUM ('NOT_REGISTERED', 'PARTY_MISMATCH', 'ASSEMBLY_DISTRICT_MISMATCH', 'CAPACITY', 'ALREADY_IN_ANOTHER_COMMITTEE');

-- CreateTable
CREATE TABLE "CommitteeGovernanceConfig" (
    "id" TEXT NOT NULL,
    "requiredPartyCode" TEXT NOT NULL,
    "maxSeatsPerLted" INTEGER NOT NULL DEFAULT 4,
    "requireAssemblyDistrictMatch" BOOLEAN NOT NULL DEFAULT true,
    "nonOverridableIneligibilityReasons" "IneligibilityReason"[] DEFAULT ARRAY[]::"IneligibilityReason"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitteeGovernanceConfig_pkey" PRIMARY KEY ("id")
);
