-- CreateTable
CREATE TABLE "CityTown" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CityTown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CityTown_name_key" ON "CityTown"("name");
