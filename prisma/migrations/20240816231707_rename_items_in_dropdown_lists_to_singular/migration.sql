/*
  Warnings:

  - You are about to drop the column `cities` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `congressionalDistricts` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `countyLegDistricts` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `electionDistricts` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `parties` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `stateAssmblyDistricts` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `stateSenateDistricts` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `streets` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `townCodes` on the `DropdownLists` table. All the data in the column will be lost.
  - You are about to drop the column `zipCodes` on the `DropdownLists` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DropdownLists" DROP COLUMN "cities",
DROP COLUMN "congressionalDistricts",
DROP COLUMN "countyLegDistricts",
DROP COLUMN "electionDistricts",
DROP COLUMN "parties",
DROP COLUMN "stateAssmblyDistricts",
DROP COLUMN "stateSenateDistricts",
DROP COLUMN "streets",
DROP COLUMN "townCodes",
DROP COLUMN "zipCodes",
ADD COLUMN     "city" TEXT[],
ADD COLUMN     "congressionalDistrict" TEXT[],
ADD COLUMN     "countyLegDistrict" TEXT[],
ADD COLUMN     "electionDistrict" INTEGER[],
ADD COLUMN     "party" TEXT[],
ADD COLUMN     "stateAssmblyDistrict" TEXT[],
ADD COLUMN     "stateSenateDistrict" TEXT[],
ADD COLUMN     "street" TEXT[],
ADD COLUMN     "townCode" TEXT[],
ADD COLUMN     "zipCode" TEXT[];
