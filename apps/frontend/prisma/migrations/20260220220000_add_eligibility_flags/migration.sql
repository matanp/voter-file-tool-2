-- CreateEnum
CREATE TYPE "EligibilityFlagReason" AS ENUM ('PARTY_MISMATCH', 'ASSEMBLY_DISTRICT_MISMATCH', 'VOTER_NOT_FOUND', 'POSSIBLY_INACTIVE');

-- CreateEnum
CREATE TYPE "EligibilityFlagStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateTable
CREATE TABLE "EligibilityFlag" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "committeeListId" INTEGER NOT NULL,
    "voterRecordId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "reason" "EligibilityFlagReason" NOT NULL,
    "status" "EligibilityFlagStatus" NOT NULL DEFAULT 'PENDING',
    "details" JSONB,
    "sourceReportId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EligibilityFlag_status_createdAt_idx" ON "EligibilityFlag"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EligibilityFlag_committeeListId_termId_idx" ON "EligibilityFlag"("committeeListId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityFlag_membershipId_reason_status_key" ON "EligibilityFlag"("membershipId", "reason", "status");

-- AddForeignKey
ALTER TABLE "EligibilityFlag" ADD CONSTRAINT "EligibilityFlag_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CommitteeMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityFlag" ADD CONSTRAINT "EligibilityFlag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
