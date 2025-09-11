/*
  Warnings:

  - A unique constraint covering the columns `[reportId]` on the table `ReportJob` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ReportJob_reportId_key" ON "ReportJob"("reportId");
