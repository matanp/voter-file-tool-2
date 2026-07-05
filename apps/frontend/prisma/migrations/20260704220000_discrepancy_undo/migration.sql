-- CreateEnum
CREATE TYPE "DiscrepancyResolution" AS ENUM ('ACCEPTED', 'ACCEPTED_WITH_ADDRESS', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DISCREPANCY_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCREPANCY_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCREPANCY_UNDONE';

-- AlterTable
ALTER TABLE "CommitteeUploadDiscrepancy" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "resolution" "DiscrepancyResolution",
ADD COLUMN     "resolutionMetadata" JSONB;

-- CreateIndex
CREATE INDEX "CommitteeUploadDiscrepancy_resolvedAt_idx" ON "CommitteeUploadDiscrepancy"("resolvedAt");
