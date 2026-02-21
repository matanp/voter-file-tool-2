-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('MEMBER_SUBMITTED', 'MEMBER_REJECTED', 'MEMBER_CONFIRMED', 'MEMBER_ACTIVATED', 'MEMBER_RESIGNED', 'MEMBER_REMOVED', 'PETITION_RECORDED', 'MEETING_CREATED', 'REPORT_GENERATED', 'TERM_CREATED', 'JURISDICTION_ASSIGNED', 'DISCREPANCY_RESOLVED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" "PrivilegeLevel" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
