-- CreateTable
CREATE TABLE "Voter_Record_Archive" (
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

    CONSTRAINT "Voter_Record_Archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter_Record" (
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

    CONSTRAINT "Voter_Record_pkey" PRIMARY KEY ("VRCNUM")
);

-- CreateTable
CREATE TABLE "Voting_History_Record" (
    "id" SERIAL NOT NULL,
    "voterRecordId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Voting_History_Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voter_Record_Archive_VRCNUM_recordEntryYear_recordEntryNumb_key" ON "Voter_Record_Archive"("VRCNUM", "recordEntryYear", "recordEntryNumber");

-- AddForeignKey
ALTER TABLE "Voting_History_Record" ADD CONSTRAINT "Voting_History_Record_voterRecordId_fkey" FOREIGN KEY ("voterRecordId") REFERENCES "Voter_Record"("VRCNUM") ON DELETE RESTRICT ON UPDATE CASCADE;
