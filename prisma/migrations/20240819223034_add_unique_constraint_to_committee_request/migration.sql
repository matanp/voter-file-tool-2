/*
  Warnings:

  - A unique constraint covering the columns `[committeeListId,voterRecordId]` on the table `CommitteeRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CommitteeRequest_committeeListId_voterRecordId_key" ON "CommitteeRequest"("committeeListId", "voterRecordId");
