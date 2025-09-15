/*
  Warnings:

  - A unique constraint covering the columns `[date]` on the table `ElectionDate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[officeName]` on the table `OfficeName` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ElectionDate_date_key" ON "ElectionDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeName_officeName_key" ON "OfficeName"("officeName");
