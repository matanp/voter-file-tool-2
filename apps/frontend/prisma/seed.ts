import { PrismaClient, PrivilegeLevel } from "@prisma/client";

const prisma = new PrismaClient();

// Seed the database with initial privileged users
async function main() {
  console.log("Starting database seeding...");

  // Upsert developer user
  const developer = await prisma.privilegedUser.upsert({
    where: { email: "mpresberg@gmail.com" },
    update: { privilegeLevel: PrivilegeLevel.Developer },
    create: {
      email: "mpresberg@gmail.com",
      privilegeLevel: PrivilegeLevel.Developer,
    },
  });

  console.log(
    "✓ Seeded privileged user:",
    developer.email,
    "with",
    developer.privilegeLevel,
    "privileges",
  );

  // Upsert committee governance config (singleton)
  const governanceConfig = await prisma.committeeGovernanceConfig.upsert({
    where: { id: "mcdc-default" },
    update: {},
    create: {
      id: "mcdc-default",
      requiredPartyCode: "DEM",
      maxSeatsPerLted: 4,
      requireAssemblyDistrictMatch: true,
      nonOverridableIneligibilityReasons: [],
    },
  });

  console.log(
    "✓ Seeded committee governance config:",
    governanceConfig.id,
    `(maxSeats=${governanceConfig.maxSeatsPerLted}, party=${governanceConfig.requiredPartyCode})`,
  );

  // LtedDistrictCrosswalk: Run `pnpm --filter voter-file-tool db:seed-lted-crosswalk [path/to/2024 LTED Matrix.xlsx]`
  // when MCDC Matrix file is available. Empty table acceptable; set requireAssemblyDistrictMatch=false to run without AD validation.
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✓ Database seeding completed successfully");
  })
  .catch(async (e) => {
    console.error("✗ Error during database seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
