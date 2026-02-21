-- CreateTable
CREATE TABLE "UserJurisdiction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityTown" TEXT NOT NULL,
    "legDistrict" INTEGER,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "UserJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserJurisdiction_userId_termId_idx" ON "UserJurisdiction"("userId", "termId");

-- CreateIndex
CREATE INDEX "UserJurisdiction_termId_idx" ON "UserJurisdiction"("termId");

-- CreateIndex
CREATE INDEX "UserJurisdiction_createdById_idx" ON "UserJurisdiction"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "UserJurisdiction_userId_cityTown_legDistrict_termId_key" ON "UserJurisdiction"("userId", "cityTown", "legDistrict", "termId");

-- AddForeignKey
ALTER TABLE "UserJurisdiction" ADD CONSTRAINT "UserJurisdiction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJurisdiction" ADD CONSTRAINT "UserJurisdiction_termId_fkey" FOREIGN KEY ("termId") REFERENCES "CommitteeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJurisdiction" ADD CONSTRAINT "UserJurisdiction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
