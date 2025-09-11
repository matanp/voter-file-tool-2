/*
  Warnings:

  - You are about to drop the `ElectionDistrict` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VoterRecord" DROP CONSTRAINT "VoterRecord_committeeId_fkey";

-- DropTable
DROP TABLE "ElectionDistrict";

-- CreateTable
CREATE TABLE "CommitteeList" (
    "id" SERIAL NOT NULL,
    "cityTown" TEXT NOT NULL,
    "legDistrict" INTEGER,
    "electionDistrict" INTEGER NOT NULL,

    CONSTRAINT "CommitteeList_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoterRecord" ADD CONSTRAINT "VoterRecord_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "CommitteeList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
