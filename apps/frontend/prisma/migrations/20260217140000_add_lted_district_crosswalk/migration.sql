-- CreateTable
-- SRS §4.2 — LTED-to-district crosswalk. Maps (cityTown, legDistrict, electionDistrict) to Assembly,
-- Senate, Congressional, and local districts. Used for eligibility validation (§7.1) when requireAssemblyDistrictMatch.
CREATE TABLE "LtedDistrictCrosswalk" (
    "id" TEXT NOT NULL,
    "cityTown" TEXT NOT NULL,
    "legDistrict" INTEGER NOT NULL,
    "electionDistrict" INTEGER NOT NULL,
    "stateAssemblyDistrict" TEXT NOT NULL,
    "stateSenateDistrict" TEXT,
    "congressionalDistrict" TEXT,
    "countyLegDistrict" TEXT,

    CONSTRAINT "LtedDistrictCrosswalk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LtedDistrictCrosswalk_cityTown_legDistrict_electionDistrict_key" ON "LtedDistrictCrosswalk"("cityTown", "legDistrict", "electionDistrict");

-- CreateIndex
CREATE INDEX "LtedDistrictCrosswalk_cityTown_legDistrict_electionDistrict_idx" ON "LtedDistrictCrosswalk"("cityTown", "legDistrict", "electionDistrict");
