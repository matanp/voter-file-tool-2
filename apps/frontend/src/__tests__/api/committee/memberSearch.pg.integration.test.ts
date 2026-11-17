/**
 * PostgreSQL-backed scope rules for GET /api/committee/memberSearch (leader
 * feedback 2026-11-11, ticket 07). The route builds a nested Prisma filter
 * (term, status, jurisdictions, name words), so only a real database shows
 * that each rule holds: Leaders see their jurisdictions only (a null LD covers
 * the whole town), Admins see everything, only the active term counts, and
 * exited or rejected members never appear.
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
import { memberSearchResponseSchema } from "~/lib/validations/committee";
import type * as MemberSearchRoute from "~/app/api/committee/memberSearch/route";

const mockAuth = jest.fn();
jest.mock("~/auth", () => ({ auth: () => mockAuth() as unknown }));

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM = "pg-search-term";
const OLD_TERM = "pg-search-old-term";

const ADMIN = "pg-search-admin";
const GREECE_LEADER = "pg-search-greece"; // GREECE, every LD
const ROCHESTER_LEADER = "pg-search-roch"; // ROCHESTER LD 28 only
const NO_SCOPE_LEADER = "pg-search-none"; // no jurisdictions
const OLD_SCOPE_LEADER = "pg-search-old"; // PENFIELD, but only in the old term
const READER = "pg-search-reader";

describePg("GET /api/committee/memberSearch (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let route: typeof MemberSearchRoute;

  beforeAll(async () => {
    prisma = (await import("~/lib/prisma")).default;
    route = await import("~/app/api/committee/memberSearch/route");

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "CommitteeMembership", "CommitteeList", "UserJurisdiction", "CommitteeTerm", "VoterRecord", "User" CASCADE`,
    );
    await prisma.user.createMany({
      data: (
        [
          [ADMIN, PrivilegeLevel.Admin],
          [GREECE_LEADER, PrivilegeLevel.Leader],
          [ROCHESTER_LEADER, PrivilegeLevel.Leader],
          [NO_SCOPE_LEADER, PrivilegeLevel.Leader],
          [OLD_SCOPE_LEADER, PrivilegeLevel.Leader],
          [READER, PrivilegeLevel.ReadAccess],
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
          label: "PG search term",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2028-12-31"),
          isActive: true,
        },
        {
          id: OLD_TERM,
          label: "PG search old term",
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
        {
          userId: OLD_SCOPE_LEADER,
          cityTown: "PENFIELD",
          legDistrict: null,
          termId: OLD_TERM,
        },
      ].map((j) => ({ ...j, createdById: ADMIN })),
    });

    const committee = (
      cityTown: string,
      legDistrict: number,
      electionDistrict: number,
      termId = TERM,
    ) =>
      prisma.committeeList.create({
        data: { cityTown, legDistrict, electionDistrict, termId },
      });
    const greece1 = await committee("GREECE", 1, 1);
    const greece2 = await committee("GREECE", 2, 3);
    const roch28 = await committee("ROCHESTER", 28, 7);
    const roch29 = await committee("ROCHESTER", 29, 7);
    const penfield = await committee("PENFIELD", 4, 1);
    const oldGreece = await committee("GREECE", 1, 1, OLD_TERM);

    let n = 0;
    const member = async (
      firstName: string,
      lastName: string,
      committeeListId: number,
      status: MembershipStatus,
      termId = TERM,
      seatNumber = 1,
    ) => {
      n += 1;
      const VRCNUM = `PGSEARCH${String(n)}`;
      await prisma.voterRecord.create({
        data: {
          VRCNUM,
          firstName,
          lastName,
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: n,
        },
      });
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
    await member("Jane", "Smith", greece1.id, MembershipStatus.ACTIVE);
    await member("Beth%", "Marker", greece2.id, MembershipStatus.ACTIVE, TERM, 1);
    await member("J_n", "Literal", greece2.id, MembershipStatus.ACTIVE, TERM, 2);
    await member("Janet", "Smithers", greece2.id, MembershipStatus.SUBMITTED);
    await member("John", "Smith", roch28.id, MembershipStatus.CONFIRMED);
    await member("Rob", "Smith", roch29.id, MembershipStatus.ACTIVE);
    await member("Ann", "Smith", penfield.id, MembershipStatus.ACTIVE);
    await member("Sam", "Smith", greece1.id, MembershipStatus.RESIGNED);
    await member("Rita", "Smith", greece1.id, MembershipStatus.REMOVED);
    await member("Rex", "Smith", greece1.id, MembershipStatus.REJECTED);
    await member("Pat", "Smith", penfield.id, MembershipStatus.PETITIONED_LOST);
    await member("Tie", "Smith", penfield.id, MembershipStatus.PETITIONED_TIE);
    await member(
      "Old",
      "Smith",
      oldGreece.id,
      MembershipStatus.ACTIVE,
      OLD_TERM,
    );
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

  async function search(q: string) {
    const res = await route.GET(
      new NextRequest(
        `http://localhost/api/committee/memberSearch?q=${encodeURIComponent(q)}`,
      ),
    );
    return res;
  }

  async function names(q: string) {
    const res = await search(q);
    expect(res.status).toBe(200);
    const body = memberSearchResponseSchema.parse(await res.json());
    return body.hits.map((h) => `${h.firstName ?? ""} ${h.lastName ?? ""}`);
  }

  it("Admin finds non-exited members in every committee of the active term", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    expect(await names("smith")).toEqual([
      "Ann Smith",
      "Jane Smith",
      "John Smith",
      "Rob Smith",
      "Janet Smithers",
    ]);
  });

  it("never returns RESIGNED, REMOVED, REJECTED or PETITIONED_* members", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    for (const first of ["Sam", "Rita", "Rex", "Pat", "Tie"]) {
      expect(await names(first)).toEqual([]);
    }
  });

  it("ignores members of an inactive term", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    expect(await names("old")).toEqual([]);
  });

  it("labels SUBMITTED and CONFIRMED as pending and includes town, LD and ED", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    const res = await search("jan");
    const body = memberSearchResponseSchema.parse(await res.json());
    expect(body.hits).toEqual([
      expect.objectContaining({
        firstName: "Jane",
        status: "active",
        cityTown: "GREECE",
        legDistrict: 1,
        electionDistrict: 1,
      }),
      expect.objectContaining({
        firstName: "Janet",
        status: "pending",
        cityTown: "GREECE",
        legDistrict: 2,
        electionDistrict: 3,
      }),
    ]);
    const john = memberSearchResponseSchema.parse(
      await (await search("john")).json(),
    );
    expect(john.hits.map((h) => h.status)).toEqual(["pending"]);
  });

  it("matches partial first and last names case-insensitively, in any order", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    expect(await names("SMI JA")).toEqual(["Jane Smith", "Janet Smithers"]);
    expect(await names("smithers, janet")).toEqual(["Janet Smithers"]);
    expect(await names("jane doe")).toEqual([]);
  });

  it("a Leader with a null-LD jurisdiction finds members in every LD of that town only", async () => {
    signInAs(GREECE_LEADER, PrivilegeLevel.Leader);
    expect(await names("smith")).toEqual(["Jane Smith", "Janet Smithers"]);
  });

  it("a Leader with a town + LD jurisdiction sees only that LD", async () => {
    signInAs(ROCHESTER_LEADER, PrivilegeLevel.Leader);
    expect(await names("smith")).toEqual(["John Smith"]);
    expect(await names("rob")).toEqual([]);
  });

  it("a Leader gets no hit for a member outside their jurisdictions", async () => {
    signInAs(GREECE_LEADER, PrivilegeLevel.Leader);
    expect(await names("ann")).toEqual([]);
    expect(await names("john")).toEqual([]);
  });

  it("a Leader with no jurisdictions, or only an old term's, gets no hits", async () => {
    signInAs(NO_SCOPE_LEADER, PrivilegeLevel.Leader);
    expect(await names("smith")).toEqual([]);
    signInAs(OLD_SCOPE_LEADER, PrivilegeLevel.Leader);
    expect(await names("smith")).toEqual([]);
  });

  it("returns 403 for ReadAccess and 400 for a one-letter query", async () => {
    signInAs(READER, PrivilegeLevel.ReadAccess);
    expect((await search("smith")).status).toBe(403);
    signInAs(ADMIN, PrivilegeLevel.Admin);
    expect((await search(" s ")).status).toBe(400);
    expect((await search(",,")).status).toBe(400);
    expect((await search("%%")).status).toBe(400);
    expect((await search("__")).status).toBe(400);
  });

  it("treats % and _ as literal characters instead of matching everyone", async () => {
    signInAs(ADMIN, PrivilegeLevel.Admin);
    expect(await names("th%")).toEqual(["Beth% Marker"]);
    expect(await names("j_n")).toEqual(["J_n Literal"]);
  });
});
