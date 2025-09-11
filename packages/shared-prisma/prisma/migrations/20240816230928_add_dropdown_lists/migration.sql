/*
  Warnings:

  - You are about to drop the `CityTown` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CityTown";

-- CreateTable
CREATE TABLE "DropdownLists" (
    "id" SERIAL NOT NULL,
    "cities" TEXT[],
    "zipCodes" TEXT[],
    "streets" TEXT[],
    "countyLegDistricts" TEXT[],
    "stateAssmblyDistricts" TEXT[],
    "stateSenateDistricts" TEXT[],
    "congressionalDistricts" TEXT[],
    "townCodes" TEXT[],
    "electionDistricts" INTEGER[],
    "parties" TEXT[],

    CONSTRAINT "DropdownLists_pkey" PRIMARY KEY ("id")
);
