/*
  Warnings:

  - You are about to drop the `CommitteeMemberList` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VoterRecord" DROP CONSTRAINT "VoterRecord_committeeId_fkey";

-- DropTable
DROP TABLE "CommitteeMemberList";

-- CreateTable
CREATE TABLE "ElectionDistrict" (
    "electionDistrict" INTEGER NOT NULL,

    CONSTRAINT "ElectionDistrict_pkey" PRIMARY KEY ("electionDistrict")
);

-- AddForeignKey
ALTER TABLE "VoterRecord" ADD CONSTRAINT "VoterRecord_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "ElectionDistrict"("electionDistrict") ON DELETE SET NULL ON UPDATE CASCADE;
