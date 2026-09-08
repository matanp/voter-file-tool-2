/**
 * PostgreSQL-backed proof that a unique-constraint race during apply does not
 * abort the committee transaction. A mocked $transaction cannot reproduce
 * PostgreSQL's "transaction is aborted" state after P2002.
 *
 * Run with `pnpm --filter voter-file-tool test:pg`. Skips when there is no
 * local test database URL (see jest.pg.env.cjs).
 */
import { PrivilegeLevel, type PrismaClient } from "@prisma/client";
import type { applyRosterImport as ApplyRosterImport } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-import-term";
const RACE_VRCNUM = "PG_RACE";
const OK_VRCNUM = "PG_OK";
const IMPORT_CITY = "PG IMPORT TOWN";
const OTHER_CITY = "PG OTHER TOWN";
const FORCED_CONFLICT_MEMBERSHIP_ID = "pg-forced-conflict";
const ACTIVE_PER_TERM_INDEX =
  "CommitteeMembership_voterRecordId_termId_active_key";

describePg("applyRosterImport unique-constraint race (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let applyRosterImport: typeof ApplyRosterImport;

  const matchingEntry = (
    vrcnum: string,
    firstName: string,
    lastName: string,
    houseNum: number,
    street: string,
    cityTown: string,
    electionDistrict: number,
    sourceRow: number,
  ): RosterEntry => ({
    vrcnum,
    committee: { cityTown, legDistrict: 1, electionDistrict },
    claimed: {
      name: `${firstName} ${lastName}`,
      address1: `${houseNum} ${street}`,
      city: "Testville",
      state: "NY",
      zip: "14604",
    },
    membershipType: "PETITIONED",
    sourceRow,
  });

  /** Insert a voter whose claimed roster fields match the voter file. */
  const seedMatchingVoter = async (
    vrcnum: string,
    firstName: string,
    lastName: string,
    houseNum: number,
    street: string,
  ) => {
    await prisma.voterRecord.create({
      data: {
        VRCNUM: vrcnum,
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
        firstName,
        lastName,
        houseNum,
        street,
        city: "Testville",
        state: "NY",
        zipCode: "14604",
      },
    });
  };

  beforeAll(async () => {
    ({ applyRosterImport } = await import(
      "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils"
    ));
    prisma = (await import("~/lib/prisma")).default;

    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${ACTIVE_PER_TERM_INDEX}"
       ON "CommitteeMembership"("voterRecordId", "termId")
       WHERE "status" = 'ACTIVE'`,
    );
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS force_roster_activation_conflict ON "CommitteeMembership"`,
    );
    await prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS force_roster_activation_conflict()`,
    );
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE
        "AuditLog",
        "CommitteeMembership",
        "Seat",
        "CommitteeUploadDiscrepancy",
        "CommitteeList",
        "CommitteeTerm",
        "CommitteeGovernanceConfig",
        "VoterRecord",
        "User"
      CASCADE`,
    );

    await prisma.user.create({
      data: {
        id: "system",
        email: "system@internal",
        name: "System",
        privilegeLevel: PrivilegeLevel.Developer,
      },
    });
    await prisma.committeeTerm.create({
      data: {
        id: TERM_ID,
        label: "PG 2026–2028",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2028-12-31"),
        isActive: true,
      },
    });
    await prisma.committeeGovernanceConfig.create({
      data: {
        id: "pg-governance",
        requiredPartyCode: "DEM",
        maxSeatsPerLted: 4,
        requireAssemblyDistrictMatch: true,
        nonOverridableIneligibilityReasons: [],
      },
    });

    await seedMatchingVoter(RACE_VRCNUM, "RACE", "VOTER", 10, "Oak St");
    await seedMatchingVoter(OK_VRCNUM, "OKAY", "VOTER", 20, "Pine St");

    const otherCommittee = await prisma.committeeList.create({
      data: {
        cityTown: OTHER_CITY,
        legDistrict: 1,
        electionDistrict: 2,
        termId: TERM_ID,
      },
    });

    // Insert a conflicting ACTIVE row in another session of the same statement
    // as the import's write, so planning and the pre-write check both miss it.
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION force_roster_activation_conflict()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.status = 'ACTIVE'
           AND NEW."voterRecordId" = '${RACE_VRCNUM}'
           AND NEW."committeeListId" <> ${otherCommittee.id} THEN
          INSERT INTO "CommitteeMembership" (
            id,
            "voterRecordId",
            "committeeListId",
            "termId",
            status,
            "membershipType",
            "activatedAt",
            "submittedAt"
          ) VALUES (
            '${FORCED_CONFLICT_MEMBERSHIP_ID}',
            NEW."voterRecordId",
            ${otherCommittee.id},
            NEW."termId",
            'ACTIVE',
            'APPOINTED',
            NOW(),
            NOW()
          );
        END IF;
        RETURN NEW;
      END;
      $$`);
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS force_roster_activation_conflict ON "CommitteeMembership"`,
    );
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER force_roster_activation_conflict
      BEFORE INSERT OR UPDATE ON "CommitteeMembership"
      FOR EACH ROW
      EXECUTE PROCEDURE force_roster_activation_conflict()`);
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS force_roster_activation_conflict ON "CommitteeMembership"`,
    );
    await prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS force_roster_activation_conflict()`,
    );
  });

  it("records the raced voter as already-active-elsewhere and still activates the rest of the committee", async () => {
    const plan = await applyRosterImport({
      entries: [
        matchingEntry(
          RACE_VRCNUM,
          "RACE",
          "VOTER",
          10,
          "Oak St",
          IMPORT_CITY,
          1,
          2,
        ),
        matchingEntry(
          OK_VRCNUM,
          "OKAY",
          "VOTER",
          20,
          "Pine St",
          IMPORT_CITY,
          1,
          3,
        ),
      ],
      rejected: [],
    });

    expect(
      plan.discrepancies.get(RACE_VRCNUM)?.discrepancies
        .alreadyActiveInAnotherCommittee,
    ).toEqual({
      incoming: `${IMPORT_CITY}-1-1`,
      existing: "Voter is already active in another committee for this term",
    });

    const memberships = await prisma.committeeMembership.findMany({
      where: { termId: TERM_ID },
      select: {
        voterRecordId: true,
        status: true,
        committeeList: {
          select: { cityTown: true },
        },
      },
      orderBy: { voterRecordId: "asc" },
    });

    expect(memberships).toEqual([
      {
        voterRecordId: OK_VRCNUM,
        status: "ACTIVE",
        committeeList: { cityTown: IMPORT_CITY },
      },
    ]);
  });
});
