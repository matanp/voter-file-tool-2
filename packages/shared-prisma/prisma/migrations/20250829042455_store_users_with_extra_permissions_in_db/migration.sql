-- CreateTable
CREATE TABLE "PrivilegedUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "privilegeLevel" "PrivilegeLevel" NOT NULL,

    CONSTRAINT "PrivilegedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivilegedUser_email_key" ON "PrivilegedUser"("email");
