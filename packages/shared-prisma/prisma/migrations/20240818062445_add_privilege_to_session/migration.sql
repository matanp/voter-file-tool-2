-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "privilegeStatus" "PrivilegeLevel" NOT NULL DEFAULT 'ReadAccess';
