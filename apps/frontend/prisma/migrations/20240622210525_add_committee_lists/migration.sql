-- AlterTable
ALTER TABLE "VoterRecord" ADD COLUMN     "committeeId" INTEGER;

-- CreateTable
CREATE TABLE "CommitteeMemberList" (
    "id" SERIAL NOT NULL,
    "electionDistrict" INTEGER NOT NULL,

    CONSTRAINT "CommitteeMemberList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeMemberList_electionDistrict_key" ON "CommitteeMemberList"("electionDistrict");

-- AddForeignKey
ALTER TABLE "VoterRecord" ADD CONSTRAINT "VoterRecord_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "CommitteeMemberList"("electionDistrict") ON DELETE SET NULL ON UPDATE CASCADE;
