/*
  Warnings:

  - You are about to drop the column `requestedById` on the `CommitteeRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CommitteeRequest" DROP CONSTRAINT "CommitteeRequest_requestedById_fkey";

-- AlterTable
ALTER TABLE "CommitteeRequest" DROP COLUMN "requestedById";
