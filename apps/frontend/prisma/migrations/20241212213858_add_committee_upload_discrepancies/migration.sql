-- CreateTable
CREATE TABLE "CommitteeUploadDiscrepancy" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "discrepancy" JSONB NOT NULL,

    CONSTRAINT "CommitteeUploadDiscrepancy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommitteeUploadDiscrepancy" ADD CONSTRAINT "CommitteeUploadDiscrepancy_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "VoterRecord"("VRCNUM") ON DELETE RESTRICT ON UPDATE CASCADE;
