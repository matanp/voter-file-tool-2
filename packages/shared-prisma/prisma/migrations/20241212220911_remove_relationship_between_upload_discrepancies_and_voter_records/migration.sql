/*
  Warnings:

  - You are about to drop the column `voterId` on the `CommitteeUploadDiscrepancy` table. All the data in the column will be lost.
  - Added the required column `VRCNUM` to the `CommitteeUploadDiscrepancy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" DROP CONSTRAINT "CommitteeUploadDiscrepancy_voterId_fkey";

-- AlterTable
ALTER TABLE "CommitteeUploadDiscrepancy" DROP COLUMN "voterId",
ADD COLUMN     "VRCNUM" TEXT NOT NULL;
