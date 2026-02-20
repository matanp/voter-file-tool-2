-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('EXECUTIVE_COMMITTEE', 'OTHER');

-- CreateTable
CREATE TABLE "MeetingRecord" (
    "id" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingType" "MeetingType" NOT NULL DEFAULT 'EXECUTIVE_COMMITTEE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MeetingRecord" ADD CONSTRAINT "MeetingRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_meetingRecordId_fkey" FOREIGN KEY ("meetingRecordId") REFERENCES "MeetingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
