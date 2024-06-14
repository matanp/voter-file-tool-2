/*
  Warnings:

  - You are about to drop the `Voter_Record` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Voter_Record_Archive` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Voting_History_Record` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Voting_History_Record" DROP CONSTRAINT "Voting_History_Record_voterRecordId_fkey";

-- DropTable
DROP TABLE "Voter_Record";

-- DropTable
DROP TABLE "Voter_Record_Archive";

-- DropTable
DROP TABLE "Voting_History_Record";

-- CreateTable
CREATE TABLE "VoterRecordArchive" (
    "id" SERIAL NOT NULL,
    "VRCNUM" INTEGER NOT NULL,
    "recordEntryYear" INTEGER NOT NULL,
    "recordEntryNumber" INTEGER NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "middleInitial" TEXT,
    "suffixName" TEXT,
    "houseNum" INTEGER,
    "street" TEXT,
    "apartment" TEXT,
    "halfAddress" TEXT,
    "resAddrLine2" TEXT,
    "resAddrLine3" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "zipSuffix" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "mailingAddress1" TEXT,
    "mailingAddress2" TEXT,
    "mailingAddress3" TEXT,
    "mailingAddress4" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZip" TEXT,
    "mailingZipSuffix" TEXT,
    "party" TEXT,
    "gender" TEXT,
    "DOB" TIMESTAMP(3),
    "L_T" TEXT,
    "electionDistrict" INTEGER,
    "countyLegDistrict" TEXT,
    "stateAssmblyDistrict" TEXT,
    "stateSenateDistrict" TEXT,
    "congressionalDistrict" TEXT,
    "CC_WD_Village" TEXT,
    "townCode" TEXT,
    "lastUpdate" TIMESTAMP(3),
    "originalRegDate" TIMESTAMP(3),
    "statevid" TEXT,

    CONSTRAINT "VoterRecordArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterRecord" (
    "VRCNUM" INTEGER NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "middleInitial" TEXT,
    "suffixName" TEXT,
    "houseNum" INTEGER,
    "street" TEXT,
    "apartment" TEXT,
    "halfAddress" TEXT,
    "resAddrLine2" TEXT,
    "resAddrLine3" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "zipSuffix" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "mailingAddress1" TEXT,
    "mailingAddress2" TEXT,
    "mailingAddress3" TEXT,
    "mailingAddress4" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZip" TEXT,
    "mailingZipSuffix" TEXT,
    "party" TEXT,
    "gender" TEXT,
    "DOB" TIMESTAMP(3),
    "L_T" TEXT,
    "electionDistrict" INTEGER,
    "countyLegDistrict" TEXT,
    "stateAssmblyDistrict" TEXT,
    "stateSenateDistrict" TEXT,
    "congressionalDistrict" TEXT,
    "CC_WD_Village" TEXT,
    "townCode" TEXT,
    "lastUpdate" TIMESTAMP(3),
    "originalRegDate" TIMESTAMP(3),
    "statevid" TEXT,
    "hasDiscrepancy" BOOLEAN,

    CONSTRAINT "VoterRecord_pkey" PRIMARY KEY ("VRCNUM")
);

-- CreateTable
CREATE TABLE "VotingHistoryRecord" (
    "id" SERIAL NOT NULL,
    "voterRecordId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "VotingHistoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoterRecordArchive_VRCNUM_recordEntryYear_recordEntryNumber_key" ON "VoterRecordArchive"("VRCNUM", "recordEntryYear", "recordEntryNumber");

-- AddForeignKey
ALTER TABLE "VotingHistoryRecord" ADD CONSTRAINT "VotingHistoryRecord_voterRecordId_fkey" FOREIGN KEY ("voterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;
