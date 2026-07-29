-- SRS 3.1 — Pending jurisdiction scope captured at Leader invite time.
-- CreateTable
CREATE TABLE "InviteJurisdiction" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "cityTown" TEXT NOT NULL,
    "legDistrict" INTEGER,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteJurisdiction_inviteId_idx" ON "InviteJurisdiction"("inviteId");

-- CreateIndex
CREATE INDEX "InviteJurisdiction_termId_idx" ON "InviteJurisdiction"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteJurisdiction_inviteId_cityTown_legDistrict_termId_key" ON "InviteJurisdiction"("inviteId", "cityTown", "legDistrict", "termId");

-- Enforce uniqueness when legDistrict IS NULL ("all districts").
-- PostgreSQL treats NULL values as distinct in standard unique indexes, so the
-- composite key above does not prevent duplicate (inviteId, cityTown, NULL, termId)
-- rows. This partial index ensures at most one such row per (inviteId, cityTown, termId).
-- SCHEMA DRIFT: not represented in schema.prisma (Prisma has no partial index support);
-- mirrors UserJurisdiction_userId_cityTown_termId_legDistrict_null_key.
CREATE UNIQUE INDEX "InviteJurisdiction_inviteId_cityTown_termId_legDistrict_null_key"
ON "InviteJurisdiction"("inviteId", "cityTown", "termId")
WHERE "legDistrict" IS NULL;

-- AddForeignKey
ALTER TABLE "InviteJurisdiction" ADD CONSTRAINT "InviteJurisdiction_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteJurisdiction" ADD CONSTRAINT "InviteJurisdiction_termId_fkey" FOREIGN KEY ("termId") REFERENCES "CommitteeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
