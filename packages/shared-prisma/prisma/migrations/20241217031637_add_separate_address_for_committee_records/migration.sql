/*
  Warnings:

  - A unique constraint covering the columns `[VRCNUM]` on the table `CommitteeUploadDiscrepancy` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "VoterRecord" ADD COLUMN     "addressForCommittee" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeUploadDiscrepancy_VRCNUM_key" ON "CommitteeUploadDiscrepancy"("VRCNUM");
