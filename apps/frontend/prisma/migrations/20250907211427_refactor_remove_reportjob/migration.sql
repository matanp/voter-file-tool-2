/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the `ReportJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReportJob" DROP CONSTRAINT "ReportJob_reportId_fkey";

-- DropForeignKey
ALTER TABLE "ReportJob" DROP CONSTRAINT "ReportJob_requestedById_fkey";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "createdAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "fileKey" DROP NOT NULL;

-- DropTable
DROP TABLE "ReportJob";
