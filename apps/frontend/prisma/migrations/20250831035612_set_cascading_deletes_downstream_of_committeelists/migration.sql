-- DropForeignKey
ALTER TABLE "CommitteeRequest" DROP CONSTRAINT "CommitteeRequest_committeeListId_fkey";

-- DropForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" DROP CONSTRAINT "CommitteeUploadDiscrepancy_committeeId_fkey";

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_committeeListId_fkey" FOREIGN KEY ("committeeListId") REFERENCES "CommitteeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" ADD CONSTRAINT "CommitteeUploadDiscrepancy_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "CommitteeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
