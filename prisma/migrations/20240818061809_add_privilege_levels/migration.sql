-- CreateEnum
CREATE TYPE "PrivilegeLevel" AS ENUM ('Developer', 'Admin', 'RequestAccess', 'ReadAccess');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "privilegeLevel" "PrivilegeLevel" NOT NULL DEFAULT 'ReadAccess';
