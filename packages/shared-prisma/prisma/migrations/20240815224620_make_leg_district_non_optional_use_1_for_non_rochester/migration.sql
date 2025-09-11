/*
  Warnings:

  - Made the column `legDistrict` on table `CommitteeList` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CommitteeList" ALTER COLUMN "legDistrict" SET NOT NULL;
