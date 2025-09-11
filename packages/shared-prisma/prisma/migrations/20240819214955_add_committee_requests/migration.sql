-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "CommitteeRequest" (
    "id" SERIAL NOT NULL,
    "committeeListId" INTEGER NOT NULL,
    "voterRecordId" INTEGER NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestNotes" TEXT,
    "requestStatus" "RequestStatus" NOT NULL,

    CONSTRAINT "CommitteeRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_committeeListId_fkey" FOREIGN KEY ("committeeListId") REFERENCES "CommitteeList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_voterRecordId_fkey" FOREIGN KEY ("voterRecordId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeRequest" ADD CONSTRAINT "CommitteeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
