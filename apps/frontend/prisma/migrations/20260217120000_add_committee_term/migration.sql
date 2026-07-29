-- CreateTable
CREATE TABLE "CommitteeTerm" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitteeTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeTerm_label_key" ON "CommitteeTerm"("label");

-- Insert default term for backfill (2024-2026)
INSERT INTO "CommitteeTerm" ("id", "label", "startDate", "endDate", "isActive", "createdAt")
VALUES (
  'term-default-2024-2026',
  '2024–2026',
  '2024-01-01'::timestamp,
  '2026-12-31'::timestamp,
  true,
  CURRENT_TIMESTAMP
);

-- Add termId column (nullable first for backfill)
ALTER TABLE "CommitteeList" ADD COLUMN "termId" TEXT;

-- Backfill: assign all existing committees to default term
UPDATE "CommitteeList" SET "termId" = 'term-default-2024-2026';

-- Make termId required
ALTER TABLE "CommitteeList" ALTER COLUMN "termId" SET NOT NULL;

-- Drop old unique index (PostgreSQL unique constraints use indexes)
DROP INDEX "CommitteeList_cityTown_legDistrict_electionDistrict_key";

-- Add new unique index including termId
CREATE UNIQUE INDEX "CommitteeList_cityTown_legDistrict_electionDistrict_termId_key" ON "CommitteeList"("cityTown", "legDistrict", "electionDistrict", "termId");

-- Add FK
ALTER TABLE "CommitteeList" ADD CONSTRAINT "CommitteeList_termId_fkey" FOREIGN KEY ("termId") REFERENCES "CommitteeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
