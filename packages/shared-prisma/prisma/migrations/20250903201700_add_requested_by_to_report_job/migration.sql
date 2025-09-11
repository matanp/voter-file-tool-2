/*
  Warnings:

  - Added the required column `requestedById` to the `ReportJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ReportJob" ADD COLUMN     "requestedById" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
