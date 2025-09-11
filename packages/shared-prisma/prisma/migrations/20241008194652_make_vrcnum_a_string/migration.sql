/*
  Warnings:

  - The primary key for the `VoterRecord` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "CommitteeRequest" DROP CONSTRAINT "CommitteeRequest_addVoterRecordId_fkey";

-- DropForeignKey
ALTER TABLE "CommitteeRequest" DROP CONSTRAINT "CommitteeRequest_removeVoterRecordId_fkey";

-- DropForeignKey
ALTER TABLE "VotingHistoryRecord" DROP CONSTRAINT "VotingHistoryRecord_voterRecordId_fkey";

-- AlterTable
ALTER TABLE "CommitteeRequest" ALTER COLUMN "addVoterRecordId" SET DATA TYPE TEXT,
ALTER COLUMN "removeVoterRecordId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "VoterRecord" DROP CONSTRAINT "VoterRecord_pkey",
ALTER COLUMN "VRCNUM" SET DATA TYPE TEXT,
ADD CONSTRAINT "VoterRecord_pkey" PRIMARY KEY ("VRCNUM");

-- AlterTable
ALTER TABLE "VoterRecordArchive" ALTER COLUMN "VRCNUM" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "VotingHistoryRecord" ALTER COLUMN "voterRecordId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "VotingHistoryRecord" ADD CONSTRAINT "VotingHistoryRecord_voterRecordId_fkey" FOREIGN KEY ("voterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_addVoterRecordId_fkey" FOREIGN KEY ("addVoterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_removeVoterRecordId_fkey" FOREIGN KEY ("removeVoterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;
