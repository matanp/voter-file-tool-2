-- DropForeignKey
ALTER TABLE "Voting_History_Record" DROP CONSTRAINT "Voting_History_Record_voterRecordId_fkey";

-- AddForeignKey
ALTER TABLE "Voting_History_Record" ADD CONSTRAINT "Voting_History_Record_voterRecordId_fkey" FOREIGN KEY ("voterRecordId") REFERENCES "Voter_Record"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;
