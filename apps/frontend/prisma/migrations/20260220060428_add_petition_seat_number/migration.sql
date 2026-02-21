-- AlterTable
ALTER TABLE "CommitteeMembership" ADD COLUMN     "petitionSeatNumber" INTEGER;

-- CreateIndex
CREATE INDEX "CommitteeMembership_committeeListId_termId_petitionSeatNumb_idx" ON "CommitteeMembership"("committeeListId", "termId", "petitionSeatNumber");
