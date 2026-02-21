-- AlterTable
ALTER TABLE "CommitteeList" ADD COLUMN     "ltedWeight" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "committeeListId" INTEGER NOT NULL,
    "termId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "isPetitioned" BOOLEAN NOT NULL DEFAULT false,
    "weight" DECIMAL(65,30),

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Seat_committeeListId_termId_idx" ON "Seat"("committeeListId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_committeeListId_termId_seatNumber_key" ON "Seat"("committeeListId", "termId", "seatNumber");

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_committeeListId_fkey" FOREIGN KEY ("committeeListId") REFERENCES "CommitteeList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_termId_fkey" FOREIGN KEY ("termId") REFERENCES "CommitteeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: create maxSeatsPerLted Seat records per CommitteeList (from CommitteeGovernanceConfig)
INSERT INTO "Seat" ("id", "committeeListId", "termId", "seatNumber", "isPetitioned", "weight")
SELECT
  gen_random_uuid()::text,
  cl.id,
  cl."termId",
  gs.n,
  false,
  NULL
FROM "CommitteeList" cl
CROSS JOIN generate_series(1, (SELECT "maxSeatsPerLted" FROM "CommitteeGovernanceConfig" LIMIT 1)) AS gs(n);
