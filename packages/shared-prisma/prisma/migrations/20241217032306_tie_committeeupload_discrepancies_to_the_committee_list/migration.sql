/*
  Warnings:

  - Added the required column `committeeId` to the `CommitteeUploadDiscrepancy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommitteeUploadDiscrepancy" ADD COLUMN     "committeeId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" ADD CONSTRAINT "CommitteeUploadDiscrepancy_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "CommitteeList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
