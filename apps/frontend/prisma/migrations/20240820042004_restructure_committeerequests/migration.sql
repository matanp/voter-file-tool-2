/*
  Warnings:

  - You are about to drop the column `requestStatus` on the `CommitteeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `voterRecordId` on the `CommitteeRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CommitteeRequest" DROP CONSTRAINT "CommitteeRequest_voterRecordId_fkey";

-- DropIndex
DROP INDEX "CommitteeRequest_committeeListId_voterRecordId_key";

-- AlterTable
ALTER TABLE "CommitteeRequest" DROP COLUMN "requestStatus",
DROP COLUMN "voterRecordId",
ADD COLUMN     "addVoterRecordId" INTEGER,
ADD COLUMN     "removeVoterRecordId" INTEGER;

-- DropEnum
DROP TYPE "RequestStatus";

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_addVoterRecordId_fkey" FOREIGN KEY ("addVoterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_removeVoterRecordId_fkey" FOREIGN KEY ("removeVoterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;
