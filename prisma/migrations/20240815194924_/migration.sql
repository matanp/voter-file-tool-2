/*
  Warnings:

  - A unique constraint covering the columns `[cityTown,legDistrict,electionDistrict]` on the table `CommitteeList` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CommitteeList_cityTown_legDistrict_electionDistrict_key" ON "CommitteeList"("cityTown", "legDistrict", "electionDistrict");
