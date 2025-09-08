-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CommitteeReport', 'DesignatedPetition');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "ReportType" "ReportType" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
