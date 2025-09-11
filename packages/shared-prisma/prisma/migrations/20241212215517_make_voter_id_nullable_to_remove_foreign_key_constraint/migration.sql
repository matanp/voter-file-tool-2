-- DropForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" DROP CONSTRAINT "CommitteeUploadDiscrepancy_voterId_fkey";

-- AlterTable
ALTER TABLE "CommitteeUploadDiscrepancy" ALTER COLUMN "voterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" ADD CONSTRAINT "CommitteeUploadDiscrepancy_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE SET NULL ON UPDATE CASCADE;
