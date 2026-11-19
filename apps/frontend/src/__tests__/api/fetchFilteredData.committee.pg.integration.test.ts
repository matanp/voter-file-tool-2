/**
 * PostgreSQL-backed scope rules for the `activeCommittee` field on
 * POST /api/fetchFilteredData (ticket 08). The lookup is a nested Prisma
 * filter (records on the page, term, status, jurisdictions), so only a real
 * database shows each rule holds: Admins and Developers see every committee,
 * Leaders their jurisdictions only (a null LD covers the whole town),
 * ReadAccess and RequestAccess nothing, and only ACTIVE members of the active
 * term get the field.
 *
 * Run with `pnpm --filter voter-file-tool test:pg`; skips without a local
 * test URL. Auth is mocked; everything below the session is real.
 */
import { NextRequest } from "next/server";
import {
  MembershipStatus,
  PrivilegeLevel,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";
import type { RecordSearchCommittee } from "~/lib/validations/recordSearch";
import type * as FetchFilteredDataRoute from "~/app/api/fetchFilteredData/route";

const mockAuth = jest.fn();
jest.mock("~/auth", () => ({ auth: () => mockAuth() as unknown }));

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM = "pg-rs-term";
const OLD_TERM = "pg-rs-old-term";

const ADMIN = "pg-rs-admin";
const DEVELOPER = "pg-rs-dev";
const GREECE_LEADER = "pg-rs-greece"; // GREECE, every LD
const ROCHESTER_LEADER = "pg-rs-roch"; // ROCHESTER LD 28 only
const NO_SCOPE_LEADER = "pg-rs-none"; // no jurisdictions
const READER = "pg-rs-reader";
const REQUESTER = "pg-rs-requester";

/** Every test voter shares this last name, so one search returns them all. */
const LAST_NAME = "PGRECORDSEARCH";

const committeeSchema = z.object({
  committeeListId: z.number().int(),
  cityTown: z.string(),
  legDistrict: z.number().int(),
  electionDistrict: z.number().int(),
}) satisfies z.ZodType<RecordSearchCommittee>;

const responseSchema = z.object({
  data: z.array(
    z
      .object({
        VRCNUM: z.string(),
        firstName: z.string().nullable(),
        activeCommittee: committeeSchema.optional(),
      })
      .passthrough(),
  ),
  totalRecords: z.number(),
});

describePg("POST /api/fetchFilteredData activeCommittee (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let route: typeof FetchFilteredDataRoute;
  const committeeIds: Record<string, number> = {};

  beforeAll(async () => {
    prisma = (await import("~/lib/prisma")).default;
    route = await import("~/app/api/fetchFilteredData/route");

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "CommitteeMembership", "CommitteeList", "UserJurisdiction", "CommitteeTerm", "VoterRecord", "User" CASCADE`,
    );
    await prisma.user.createMany({
      data: (
        [
          [ADMIN, PrivilegeLevel.Admin],
          [DEVELOPER, PrivilegeLevel.Developer],
          [GREECE_LEADER, PrivilegeLevel.Leader],
          [ROCHESTER_LEADER, PrivilegeLevel.Leader],
          [NO_SCOPE_LEADER, PrivilegeLevel.Leader],
          [READER, PrivilegeLevel.ReadAccess],
          [REQUESTER, PrivilegeLevel.RequestAccess],
        ] as const
      ).map(([id, privilegeLevel]) => ({
        id,
        email: `${id}@example.org`,
        privilegeLevel,
      })),
    });
    await prisma.committeeTerm.createMany({
      data: [
        {
          id: TERM,
          label: "PG record search term",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2028-12-31"),
          isActive: true,
        },
        {
          id: OLD_TERM,
          label: "PG record search old term",
          startDate: new Date("2022-01-01"),
          endDate: new Date("2024-12-31"),
          isActive: false,
        },
      ],
    });
    await prisma.userJurisdiction.createMany({
      data: [
        {
          userId: GREECE_LEADER,
          cityTown: "GREECE",
          legDistrict: null,
          termId: TERM,
        },
        {
          userId: ROCHESTER_LEADER,
          cityTown: "ROCHESTER",
          legDistrict: 28,
          termId: TERM,
        },
        // Left over from when these users were Leaders: a lower real role
        // must still see nothing, whatever jurisdiction rows remain.
        ...[READER, REQUESTER].map((userId) => ({
          userId,
          cityTown: "GREECE",
          legDistrict: null,
          termId: TERM,
        })),
        // An old-term scope must not count in the active term.
        {
          userId: NO_SCOPE_LEADER,
          cityTown: "PENFIELD",
          legDistrict: null,
          termId: OLD_TERM,
        },
      ].map((j) => ({ ...j, createdById: ADMIN })),
    });

    const committee = async (
      key: string,
      cityTown: string,
      legDistrict: number,
      electionDistrict: number,
      termId = TERM,
    ) => {
      const row = await prisma.committeeList.create({
        data: { cityTown, legDistrict, electionDistrict, termId },
      });
      committeeIds[key] = row.id;
      return row.id;
    };
    const greece1 = await committee("greece1", "GREECE", 1, 5);
    const greece2 = await committee("greece2", "GREECE", 2, 3);
    const roch28 = await committee("roch28", "ROCHESTER", 28, 7);
    const roch29 = await committee("roch29", "ROCHESTER", 29, 7);
    const penfield = await committee("penfield", "PENFIELD", 4, 1);
    const oldGreece = await committee("oldGreece", "GREECE", 1, 5, OLD_TERM);

    let n = 0;
    const voter = async (
      firstName: string,
      membership?: {
        committeeListId: number;
        status: MembershipStatus;
        termId?: string;
        seatNumber?: number;
      },
    ) => {
      n += 1;
      const VRCNUM = `PGRS${String(n).padStart(3, "0")}`;
      await prisma.voterRecord.create({
        data: {
          VRCNUM,
          firstName,
          lastName: LAST_NAME,
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: n,
        },
      });
      if (!membership) return;
      const {
        committeeListId,
        status,
        termId = TERM,
        seatNumber = 1,
      } = membership;
      await prisma.committeeMembership.create({
        data: {
          voterRecordId: VRCNUM,
          committeeListId,
          termId,
          status,
          ...(status === MembershipStatus.ACTIVE
            ? { membershipType: "PETITIONED", seatNumber }
            : {}),
        },
      });
    };
    const active = (committeeListId: number, seatNumber = 1) => ({
      committeeListId,
      status: MembershipStatus.ACTIVE,
      seatNumber,
    });

    await voter("AGREECEONE", active(greece1));
    await voter("BGREECETWO", active(greece2));
    await voter("CROCHTWENTYEIGHT", active(roch28));
    await voter("DROCHTWENTYNINE", active(roch29));
    await voter("EPENFIELD", active(penfield));
    await voter("FNOMEMBERSHIP");
    for (const [name, status] of [
      ["GSUBMITTED", MembershipStatus.SUBMITTED],
      ["HCONFIRMED", MembershipStatus.CONFIRMED],
      ["IRESIGNED", MembershipStatus.RESIGNED],
      ["JREMOVED", MembershipStatus.REMOVED],
      ["KREJECTED", MembershipStatus.REJECTED],
      ["LPETITIONEDLOST", MembershipStatus.PETITIONED_LOST],
    ] as const) {
      await voter(name, { committeeListId: greece1, status });
    }
    await voter("MOLDTERM", {
      committeeListId: oldGreece,
      status: MembershipStatus.ACTIVE,
      termId: OLD_TERM,
    });
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  function signInAs(id: string, privilegeLevel: PrivilegeLevel) {
    mockAuth.mockResolvedValue({
      user: { id, privilegeLevel },
      expires: "2099-01-01",
    });
  }

  async function search(page = 1, pageSize = 100, includeCommittee = true) {
    const res = await route.POST(
      new NextRequest("http://localhost/api/fetchFilteredData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQuery: [{ field: "lastName", values: [LAST_NAME] }],
          page,
          pageSize,
          includeCommittee,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const raw = (await res.json()) as unknown;
    return { raw, body: responseSchema.parse(raw) };
  }

  /** firstName -> committee label, for voters that carry the field. */
  async function badges(
    page?: number,
    pageSize?: number,
  ): Promise<Record<string, string>> {
    const { body } = await search(page, pageSize);
    const labels: Record<string, string> = {};
    for (const { firstName, activeCommittee: c } of body.data) {
      if (c) {
        labels[firstName ?? ""] =
          `${c.cityTown} ${String(c.legDistrict)}/${String(c.electionDistrict)}`;
      }
    }
    return labels;
  }

  const EVERY_ACTIVE = {
    AGREECEONE: "GREECE 1/5",
    BGREECETWO: "GREECE 2/3",
    CROCHTWENTYEIGHT: "ROCHESTER 28/7",
    DROCHTWENTYNINE: "ROCHESTER 29/7",
    EPENFIELD: "PENFIELD 4/1",
  };

  it.each([
    [ADMIN, PrivilegeLevel.Admin],
    [DEVELOPER, PrivilegeLevel.Developer],
  ] as const)(
    "%s sees ACTIVE active-term members of every committee, with town, LD and ED",
    async (id, level) => {
      signInAs(id, level);
      expect(await badges()).toEqual(EVERY_ACTIVE);
      const { body } = await search();
      expect(
        body.data.find((r) => r.firstName === "AGREECEONE")?.activeCommittee,
      ).toEqual({
        committeeListId: committeeIds.greece1,
        cityTown: "GREECE",
        legDistrict: 1,
        electionDistrict: 5,
      });
    },
  );

  it("SUBMITTED, CONFIRMED, exited, rejected, lost and old-term memberships give no field", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    const { body } = await search();
    expect(body.data).toHaveLength(13);
    for (const name of [
      "FNOMEMBERSHIP",
      "GSUBMITTED",
      "HCONFIRMED",
      "IRESIGNED",
      "JREMOVED",
      "KREJECTED",
      "LPETITIONEDLOST",
      "MOLDTERM",
    ]) {
      const record = body.data.find((r) => r.firstName === name);
      expect(record).toBeDefined();
      expect(record).not.toHaveProperty("activeCommittee");
    }
  });

  it("only the requested page is annotated", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    // Sorted by first name: page 2 of size 2 is CROCH… and DROCH….
    expect(await badges(2, 2)).toEqual({
      CROCHTWENTYEIGHT: "ROCHESTER 28/7",
      DROCHTWENTYNINE: "ROCHESTER 29/7",
    });
  });

  it("a Leader with a null-LD jurisdiction sees every LD of that town only", async () => {
    signInAs(GREECE_LEADER, PrivilegeLevel.Leader);
    expect(await badges()).toEqual({
      AGREECEONE: "GREECE 1/5",
      BGREECETWO: "GREECE 2/3",
    });
  });

  it("a Leader with a town + LD jurisdiction sees only that LD; outside it the key is absent", async () => {
    signInAs(ROCHESTER_LEADER, PrivilegeLevel.Leader);
    expect(await badges()).toEqual({ CROCHTWENTYEIGHT: "ROCHESTER 28/7" });
    const { body } = await search();
    expect(
      body.data.find((r) => r.firstName === "DROCHTWENTYNINE"),
    ).not.toHaveProperty("activeCommittee");
  });

  it("a Leader with no active-term jurisdictions gets results without the field", async () => {
    signInAs(NO_SCOPE_LEADER, PrivilegeLevel.Leader);
    const { raw, body } = await search();
    expect(body.data).toHaveLength(13);
    expect(JSON.stringify(raw)).not.toContain("activeCommittee");
  });

  it("without includeCommittee an Admin gets no membership data", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    const { raw, body } = await search(1, 100, false);
    expect(body.data).toHaveLength(13);
    expect(JSON.stringify(raw)).not.toContain("activeCommittee");
  });

  it.each([
    [READER, PrivilegeLevel.ReadAccess],
    [REQUESTER, PrivilegeLevel.RequestAccess],
  ] as const)(
    "%s gets every record and no membership data at all",
    async (id, level) => {
      signInAs(id, level);
      const { raw, body } = await search();
      expect(body.data).toHaveLength(13);
      expect(JSON.stringify(raw)).not.toContain("activeCommittee");
    },
  );
});
