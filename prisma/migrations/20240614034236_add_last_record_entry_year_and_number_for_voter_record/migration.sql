/*
  Warnings:

  - Added the required column `latestRecordEntryNumber` to the `VoterRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latestRecordEntryYear` to the `VoterRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VoterRecord" ADD COLUMN     "latestRecordEntryNumber" INTEGER NOT NULL,
ADD COLUMN     "latestRecordEntryYear" INTEGER NOT NULL;
