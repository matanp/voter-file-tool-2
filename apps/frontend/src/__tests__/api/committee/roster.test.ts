/**
 * Committee Roster View / grid read model — route tests for GET /api/committee/roster.
 * See docs/COMMITTEE_ROSTER_VIEW.md and plan §5 "Grid" / §12.1.
 */

import { PrivilegeLevel, Prisma } from "@prisma/client";
import { GET } from "~/app/api/committee/roster/route";
import {
  rosterResponseSchema,
  ROSTER_MAX_LIMIT,
  type RosterResponse,
  type SeatRosterRow,
} from "~/lib/validations/committee";
import {
  createMockSession,
  createMockRequest,
  expectErrorResponse,
  createAuthTestSuite,
  parseJsonResponse,
  parseJsonResponseWith,
  DEFAULT_ACTIVE_TERM_ID,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

type CommitteeListMock = { findMany: jest.Mock };
type UserJurisdictionMock = { findMany: jest.Mock };

function getCommitteeListMock(): CommitteeListMock {
  return (prismaMock as unknown as { committeeList: CommitteeListMock })
    .committeeList;
}

function getUserJurisdictionMock(): UserJurisdictionMock {
  return (prismaMock as unknown as { userJurisdiction: UserJurisdictionMock })
    .userJurisdiction;
}

// --- Mock factories ---------------------------------------------------------

function mockSeat(overrides: {
  seatNumber: number;
  isPetitioned?: boolean;
  weight?: number | null;
}) {
  return {
    id: `seat-${String(overrides.seatNumber)}`,
    seatNumber: overrides.seatNumber,
    isPetitioned: overrides.isPetitioned ?? false,
    weight:
      overrides.weight != null ? new Prisma.Decimal(overrides.weight) : null,
  };
}

function mockMembership(overrides: {
  seatNumber: number | null;
  membershipType?: string | null;
  VRCNUM?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  telephone?: string | null;
  submissionMetadata?: Record<string, unknown> | null;
}) {
  const vrc = overrides.VRCNUM ?? `voter-${String(overrides.seatNumber)}`;
  return {
    seatNumber: overrides.seatNumber,
    membershipType: overrides.membershipType ?? "PETITIONED",
    voterRecordId: vrc,
    submissionMetadata: overrides.submissionMetadata ?? null,
    voterRecord: {
      VRCNUM: vrc,
      firstName: overrides.firstName ?? "Jane",
      lastName: overrides.lastName ?? "Doe",
      email: overrides.email ?? null,
      telephone: overrides.telephone ?? null,
    },
  };
}

/**
 * A committee as both roster queries see it: the lean scope query reads
 * `_count.memberships` (pending) and the page query reads `voterRecord`.
 */
function mockCommittee(overrides: {
  id?: number;
  cityTown?: string;
  legDistrict?: number;
  electionDistrict?: number;
  seats?: ReturnType<typeof mockSeat>[];
  memberships?: ReturnType<typeof mockMembership>[];
  pendingCount?: number;
}) {
  return {
    id: overrides.id ?? 1,
    cityTown: overrides.cityTown ?? "Test City",
    legDistrict: overrides.legDistrict ?? 1,
    electionDistrict: overrides.electionDistrict ?? 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seats: overrides.seats ?? [],
    memberships: overrides.memberships ?? [],
    _count: { memberships: overrides.pendingCount ?? 0 },
  };
}

type Committee = ReturnType<typeof mockCommittee>;

/** The subset of committeeList.findMany args the dispatcher routes on. */
type FindManyArgs = {
  where?: { id?: { in: number[] } } & Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  distinct?: string[];
};

/**
 * Serves the three roster queries from one fixture set: the distinct filter
 * query, the page query (`where.id.in`), and the lean scope query. Scope
 * filtering itself is asserted on `where` (the DB does it in production).
 */
function mockCommittees(fixtures: Committee[]) {
  getCommitteeListMock().findMany.mockImplementation((args: FindManyArgs) => {
    if (args.distinct) {
      return Promise.resolve(
        fixtures.map(({ cityTown, legDistrict }) => ({
          cityTown,
          legDistrict,
        })),
      );
    }
    const ids = args.where?.id?.in;
    if (ids) {
      return Promise.resolve(fixtures.filter((c) => ids.includes(c.id)));
    }
    return Promise.resolve(fixtures);
  });
}

function findManyCalls(): FindManyArgs[] {
  return getCommitteeListMock().findMany.mock.calls.map(
    (call) => (call as [FindManyArgs])[0],
  );
}

function scopeQuery(): FindManyArgs {
  const call = findManyCalls().find(
    (a) => !a.distinct && a.where?.id === undefined,
  );
  if (!call) throw new Error("scope query was not issued");
  return call;
}

function filtersQuery(): FindManyArgs {
  const call = findManyCalls().find((a) => a.distinct !== undefined);
  if (!call) throw new Error("filters query was not issued");
  return call;
}

function pageQueries(): FindManyArgs[] {
  return findManyCalls().filter((a) => a.where?.id !== undefined);
}

function adminSession() {
  mockAuthSession(
    createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
  );
  mockHasPermission(true);
}

function leaderSession() {
  mockAuthSession(
    createMockSession({ user: { privilegeLevel: PrivilegeLevel.Leader } }),
  );
  mockHasPermission(true);
}

function rosterRequest(params: Record<string, string>) {
  return createMockRequest({}, params, { method: "GET" });
}

async function getRoster(params: Record<string, string>) {
  const response = await GET(rosterRequest(params));
  expect(response.status).toBe(200);
  return parseJsonResponseWith(response, rosterResponseSchema);
}

/** `rows` is optional on the contract; these tests asked for it. */
function rowsOf(body: RosterResponse): SeatRosterRow[] {
  if (body.rows === undefined) throw new Error("rows missing from response");
  return body.rows;
}

const EMPTY_SUMMARY = {
  totalSeats: 0,
  filled: 0,
  vacant: 0,
  edCount: 0,
  unassignedCount: 0,
  pendingCount: 0,
  activeMemberCount: 0,
};

describe("GET /api/committee/roster", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommittees([]);
    getUserJurisdictionMock().findMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  describe("authentication and authorization", () => {
    const authSuite = createAuthTestSuite(
      {
        endpointName: "GET /api/committee/roster",
        requiredPrivilege: PrivilegeLevel.Leader,
        mockRequest: () => rosterRequest({ cityTown: "Test City" }),
      },
      GET as (req: Parameters<typeof GET>[0]) => Promise<Response>,
      mockAuthSession,
      mockHasPermission,
      () => {
        mockCommittees([]);
        getUserJurisdictionMock().findMany.mockResolvedValue([
          { cityTown: "Test City", legDistrict: 1 },
        ]);
      },
    );

    for (const { description, runTest } of authSuite) {
      it(description, runTest);
    }

    it("returns 401 with no session even when cityTown is omitted", async () => {
      mockAuthSession(null);
      const response = await GET(rosterRequest({}));
      expect(response.status).toBe(401);
      expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
    });

    it("returns 403 for ReadAccess even when cityTown is omitted", async () => {
      mockAuthSession(
        createMockSession({
          user: { privilegeLevel: PrivilegeLevel.ReadAccess },
        }),
      );
      mockHasPermission(false);
      const response = await GET(rosterRequest({}));
      expect(response.status).toBe(403);
      expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Query validation
  // -------------------------------------------------------------------------
  describe("query validation", () => {
    it("treats an omitted cityTown as the whole scope", async () => {
      adminSession();
      const body = await getRoster({});
      expect(body.scope).toEqual({});
      expect(scopeQuery().where).toEqual({ termId: DEFAULT_ACTIVE_TERM_ID });
    });

    it("treats an empty cityTown as omitted", async () => {
      adminSession();
      const body = await getRoster({ cityTown: "  " });
      expect(body.scope).toEqual({});
    });

    it("returns 400 when Rochester is missing legDistrict", async () => {
      adminSession();
      const response = await GET(rosterRequest({ cityTown: "ROCHESTER" }));
      await expectErrorResponse(
        response,
        400,
        "Legislative District is required for Rochester",
      );
      expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
    });

    it("allows Rochester when legDistrict is provided", async () => {
      adminSession();
      const body = await getRoster({
        cityTown: "ROCHESTER",
        legDistrict: "21",
      });
      expect(body.scope).toEqual({ cityTown: "ROCHESTER", legDistrict: 21 });
    });

    it("does not require legDistrict for Rochester when cityTown is omitted", async () => {
      adminSession();
      const body = await getRoster({ legDistrict: "21" });
      expect(body.scope).toEqual({ legDistrict: 21 });
      expect(scopeQuery().where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        legDistrict: 21,
      });
    });

    it.each([
      [
        { legDistrict: "abc" },
        "Legislative District must be a positive integer",
      ],
      [{ cursor: "0" }, "cursor must be a positive integer"],
      [{ limit: "-1" }, "limit must be a positive integer"],
      [
        { limit: String(ROSTER_MAX_LIMIT + 1) },
        `limit must be at most ${String(ROSTER_MAX_LIMIT)}`,
      ],
      [{ includeRows: "yes" }, "includeRows must be true or false"],
    ])("returns 400 for %o", async (params, message) => {
      adminSession();
      const response = await GET(rosterRequest(params));
      expect(response.status).toBe(400);
      const body = await parseJsonResponse<{ error: string }>(response);
      expect(body.error).toContain(message);
      expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Jurisdiction / data scope
  // -------------------------------------------------------------------------
  describe("jurisdiction scoping", () => {
    it("applies no jurisdiction OR-filter for Admin", async () => {
      adminSession();
      await getRoster({ cityTown: "Test City" });

      expect(getUserJurisdictionMock().findMany).not.toHaveBeenCalled();
      expect(scopeQuery().where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        cityTown: "Test City",
      });
      expect(filtersQuery().where).toEqual({ termId: DEFAULT_ACTIVE_TERM_ID });
    });

    it("ANDs a mixed all-LD + specific-LD OR-filter for Leader", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Greece", legDistrict: null }, // all LDs in Greece
        { cityTown: "ROCHESTER", legDistrict: 21 }, // only LD 21
      ]);

      await getRoster({ cityTown: "Greece" });

      expect(scopeQuery().where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        cityTown: "Greece",
        OR: [
          { cityTown: "Greece" },
          { cityTown: "ROCHESTER", legDistrict: 21 },
        ],
      });
    });

    it("scopes an omitted cityTown to the Leader's jurisdictions", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Greece", legDistrict: null },
        { cityTown: "ROCHESTER", legDistrict: 21 },
      ]);

      await getRoster({});

      const expectedWhere = {
        termId: DEFAULT_ACTIVE_TERM_ID,
        OR: [
          { cityTown: "Greece" },
          { cityTown: "ROCHESTER", legDistrict: 21 },
        ],
      };
      expect(scopeQuery().where).toEqual(expectedWhere);
      expect(filtersQuery().where).toEqual(expectedWhere);
    });

    it("ANDs a cityTown outside the Leader's jurisdiction to an empty result, keeping jurisdiction filter values", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Greece", legDistrict: null },
      ]);
      // The DB would return nothing for the AND; the filters query still sees Greece.
      getCommitteeListMock().findMany.mockImplementation((args: FindManyArgs) =>
        Promise.resolve(
          args.distinct ? [{ cityTown: "Greece", legDistrict: 1 }] : [],
        ),
      );

      const body = await getRoster({ cityTown: "Webster" });

      expect(scopeQuery().where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        cityTown: "Webster",
        OR: [{ cityTown: "Greece" }],
      });
      expect(filtersQuery().where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        OR: [{ cityTown: "Greece" }],
      });
      expect(body.edRollups).toEqual([]);
      expect(body.rows).toEqual([]);
      expect(body.summary).toEqual(EMPTY_SUMMARY);
      expect(body.filters).toEqual({
        towns: ["Greece"],
        legDistricts: [{ cityTown: "Greece", legDistrict: 1 }],
      });
      expect(pageQueries()).toHaveLength(0);
    });

    it("matches nothing for a Leader with no jurisdictions (OR: [])", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([]);

      const body = await getRoster({});

      expect(scopeQuery().where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        OR: [],
      });
      expect(body).toEqual({
        scope: {},
        filters: { towns: [], legDistricts: [] },
        rows: [],
        edRollups: [],
        summary: EMPTY_SUMMARY,
        nextCursor: null,
      });
    });

    it("re-applies the scope filter on the page query", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Greece", legDistrict: null },
      ]);
      mockCommittees([mockCommittee({ id: 7, cityTown: "Greece" })]);

      await getRoster({});

      const [page] = pageQueries();
      expect(page?.where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        OR: [{ cityTown: "Greece" }],
        id: { in: [7] },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Term scoping
  // -------------------------------------------------------------------------
  describe("term scoping", () => {
    it("scopes committees, active memberships, and pending counts to the active term", async () => {
      adminSession();
      await getRoster({ cityTown: "Test City" });

      const scope = scopeQuery() as {
        where: { termId: string };
        select: {
          memberships: { where: { status: string; termId: string } };
          _count: {
            select: {
              memberships: { where: { status: string; termId: string } };
            };
          };
        };
      };
      expect(scope.where.termId).toBe(DEFAULT_ACTIVE_TERM_ID);
      expect(scope.select.memberships.where).toEqual({
        status: "ACTIVE",
        termId: DEFAULT_ACTIVE_TERM_ID,
      });
      expect(scope.select._count.select.memberships.where).toEqual({
        status: "SUBMITTED",
        termId: DEFAULT_ACTIVE_TERM_ID,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Rollups and summary
  // -------------------------------------------------------------------------
  describe("rollups and summary", () => {
    it("carries committeeListId and the composite key on each rollup", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          id: 42,
          cityTown: "Greece",
          legDistrict: 3,
          electionDistrict: 12,
        }),
      ]);

      const body = await getRoster({});

      expect(body.edRollups[0]).toMatchObject({
        committeeListId: 42,
        cityTown: "Greece",
        legDistrict: 3,
        electionDistrict: 12,
      });
    });

    it("computes vacancy, pending, and missing-weight per rollup and in the summary", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          id: 1,
          electionDistrict: 1,
          seats: [
            mockSeat({ seatNumber: 1, isPetitioned: true, weight: null }),
            mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
            mockSeat({ seatNumber: 3 }),
          ],
          memberships: [
            mockMembership({ seatNumber: 2 }),
            mockMembership({ seatNumber: null, VRCNUM: "loose" }),
          ],
          pendingCount: 2,
        }),
        mockCommittee({
          id: 2,
          electionDistrict: 2,
          seats: [], // synthesized: maxSeatsPerLted = 4 in the test config
          memberships: [mockMembership({ seatNumber: 1 })],
          pendingCount: 1,
        }),
      ]);

      const body = await getRoster({});

      expect(body.edRollups).toHaveLength(2);
      expect(body.edRollups[0]).toMatchObject({
        filled: 1,
        totalSeats: 3,
        unassignedCount: 1,
        pendingCount: 2,
        designationWeight: 0.25,
        missingWeightSeatNumbers: [1],
      });
      expect(body.edRollups[1]).toMatchObject({
        filled: 1,
        totalSeats: 4,
        unassignedCount: 0,
        pendingCount: 1,
        missingWeightSeatNumbers: [],
      });
      expect(body.summary).toEqual({
        totalSeats: 7,
        filled: 2,
        vacant: 5,
        edCount: 2,
        unassignedCount: 1,
        pendingCount: 3,
        activeMemberCount: 3,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------
  describe("pagination", () => {
    const three = () => [
      mockCommittee({
        id: 10,
        electionDistrict: 1,
        seats: [mockSeat({ seatNumber: 1 })],
        memberships: [mockMembership({ seatNumber: 1, VRCNUM: "a" })],
        pendingCount: 1,
      }),
      mockCommittee({
        id: 11,
        electionDistrict: 2,
        seats: [mockSeat({ seatNumber: 1 })],
        pendingCount: 1,
      }),
      mockCommittee({
        id: 12,
        electionDistrict: 3,
        seats: [mockSeat({ seatNumber: 1 })],
        pendingCount: 1,
      }),
    ];

    it("returns one page of rollups and rows while the summary covers the whole scope", async () => {
      adminSession();
      mockCommittees(three());

      const body = await getRoster({ limit: "2" });

      expect(body.edRollups.map((r) => r.committeeListId)).toEqual([10, 11]);
      expect(body.nextCursor).toBe(11);
      expect(rowsOf(body).map((r) => r.committeeListId)).toEqual([10, 11]);
      expect(body.summary).toEqual({
        totalSeats: 3,
        filled: 1,
        vacant: 2,
        edCount: 3,
        unassignedCount: 0,
        pendingCount: 3,
        activeMemberCount: 1,
      });
      const [page] = pageQueries();
      expect(page?.where?.id).toEqual({ in: [10, 11] });
    });

    it("continues from the cursor and ends with nextCursor null", async () => {
      adminSession();
      mockCommittees(three());

      const body = await getRoster({ limit: "2", cursor: "11" });

      expect(body.edRollups.map((r) => r.committeeListId)).toEqual([12]);
      expect(body.nextCursor).toBeNull();
      expect(body.summary.edCount).toBe(3);
    });

    it("returns 400 for a cursor that is not in scope", async () => {
      adminSession();
      mockCommittees(three());

      const response = await GET(rosterRequest({ cursor: "999" }));

      expect(response.status).toBe(400);
      const body = await parseJsonResponse<{ error: string }>(response);
      expect(body.error).toMatch(/cursor is not in scope/);
      expect(pageQueries()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // includeRows and filters
  // -------------------------------------------------------------------------
  describe("includeRows=false", () => {
    it("omits rows and never queries voter records", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [
            mockMembership({ seatNumber: 1, telephone: "585-555-0100" }),
          ],
        }),
      ]);

      const body = await getRoster({ includeRows: "false" });

      expect(body.rows).toBeUndefined();
      expect(body.edRollups).toHaveLength(1);
      expect(body.summary.filled).toBe(1);
      expect(pageQueries()).toHaveLength(0);
      expect(JSON.stringify(body)).not.toContain("585-555-0100");
    });
  });

  describe("filter values", () => {
    it("lists distinct towns and (town, LD) pairs for the base scope in grid order", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({ id: 1, cityTown: "Greece", legDistrict: 1 }),
        mockCommittee({ id: 2, cityTown: "Greece", legDistrict: 1 }),
        mockCommittee({ id: 3, cityTown: "ROCHESTER", legDistrict: 21 }),
        mockCommittee({ id: 4, cityTown: "ROCHESTER", legDistrict: 22 }),
      ]);

      const body = await getRoster({ cityTown: "Greece" });

      expect(body.filters).toEqual({
        towns: ["Greece", "ROCHESTER"],
        legDistricts: [
          { cityTown: "Greece", legDistrict: 1 },
          { cityTown: "ROCHESTER", legDistrict: 21 },
          { cityTown: "ROCHESTER", legDistrict: 22 },
        ],
      });
      expect(filtersQuery()).toMatchObject({
        where: { termId: DEFAULT_ACTIVE_TERM_ID },
        distinct: ["cityTown", "legDistrict"],
      });
    });
  });

  // -------------------------------------------------------------------------
  // Row construction
  // -------------------------------------------------------------------------
  describe("row construction", () => {
    it("emits vacant rows for unoccupied seats", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 }), mockSeat({ seatNumber: 2 })],
          memberships: [mockMembership({ seatNumber: 1 })],
        }),
      ]);

      const body = await getRoster({ cityTown: "Test City" });
      const rows = rowsOf(body);

      expect(rows).toHaveLength(2);
      const seat2 = rows.find((r) => r.seatNumber === 2);
      expect(seat2?.occupant).toBeNull();
      expect(body.summary).toMatchObject({
        totalSeats: 2,
        filled: 1,
        vacant: 1,
        edCount: 1,
      });
    });

    it("flags petitionedVacant on vacant petitioned seats", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [
            mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
          ],
          memberships: [],
        }),
      ]);

      const body = await getRoster({ cityTown: "Test City" });
      const rows = rowsOf(body);

      expect(rows[0]?.petitionedVacant).toBe(true);
      expect(rows[0]?.weight).toBe("0.25");
    });

    it("synthesizes maxSeatsPerLted vacant seats when seats is empty", async () => {
      adminSession();
      mockCommittees([mockCommittee({ seats: [], memberships: [] })]);

      const body = await getRoster({ cityTown: "Test City" });
      const rows = rowsOf(body);

      // maxSeatsPerLted default is 4 in the test governance config.
      expect(rows).toHaveLength(4);
      expect(rows.map((r) => r.seatNumber)).toEqual([1, 2, 3, 4]);
      expect(rows.every((r) => r.occupant === null)).toBe(true);
      expect(body.summary.totalSeats).toBe(4);
    });

    it("emits unassigned rows and counts them outside filled", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [1, 2, 3, 4].map((seatNumber) => mockSeat({ seatNumber })),
          memberships: [
            mockMembership({ seatNumber: null, VRCNUM: "unassigned-1" }),
          ],
        }),
      ]);

      const body = await getRoster({ cityTown: "Test City" });
      const rows = rowsOf(body);

      const unassignedRows = rows.filter((r) => r.unassigned);
      expect(unassignedRows).toHaveLength(1);
      expect(unassignedRows[0]?.seatNumber).toBeNull();
      expect(unassignedRows[0]?.occupant?.VRCNUM).toBe("unassigned-1");

      // 0 occupied seats, 1 unassigned member.
      expect(body.summary.filled).toBe(0);
      expect(body.summary.unassignedCount).toBe(1);
      expect(body.summary.activeMemberCount).toBe(1);
      expect(body.edRollups[0]).toMatchObject({
        filled: 0,
        totalSeats: 4,
        unassignedCount: 1,
      });
    });

    it("populates missingWeightSeatNumbers for petitioned seats lacking weight", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [
            mockSeat({ seatNumber: 1, isPetitioned: true, weight: null }),
            mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
          ],
          memberships: [],
        }),
      ]);

      const body = await getRoster({ cityTown: "Test City" });

      expect(body.edRollups[0]?.missingWeightSeatNumbers).toEqual([1]);
    });
  });

  // -------------------------------------------------------------------------
  // Contact / PII gating
  // -------------------------------------------------------------------------
  describe("contact gating", () => {
    it("includes contact for Admin, using voterRecord.telephone fallback", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [
            mockMembership({
              seatNumber: 1,
              email: "voter@example.com",
              telephone: "585-555-0100",
              submissionMetadata: null,
            }),
          ],
        }),
      ]);

      const body = await getRoster({ cityTown: "Test City" });

      expect(rowsOf(body)[0]?.contact).toEqual({
        email: "voter@example.com",
        phone: "585-555-0100",
      });
    });

    it("prefers submissionMetadata contact over voterRecord for Admin", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [
            mockMembership({
              seatNumber: 1,
              email: "voter@example.com",
              telephone: "585-555-0100",
              submissionMetadata: { phone: "585-555-9999" },
            }),
          ],
        }),
      ]);

      const body = await getRoster({ cityTown: "Test City" });

      expect(rowsOf(body)[0]?.contact).toEqual({
        email: "voter@example.com",
        phone: "585-555-9999",
      });
    });

    it("omits contact for Leader, including when cityTown is omitted", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Test City", legDistrict: null },
      ]);
      mockCommittees([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [
            mockMembership({
              seatNumber: 1,
              email: "voter@example.com",
              telephone: "585-555-0100",
            }),
          ],
        }),
      ]);

      const body = await getRoster({});
      const rows = rowsOf(body);

      expect(rows[0]?.occupant).not.toBeNull();
      expect(rows[0]?.contact).toBeUndefined();
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain("585-555-0100");
      expect(serialized).not.toContain("voter@example.com");
    });
  });

  // -------------------------------------------------------------------------
  // Data integrity
  // -------------------------------------------------------------------------
  describe("data integrity", () => {
    it("returns 409 when two active memberships claim the same seat", async () => {
      adminSession();
      mockCommittees([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [
            mockMembership({ seatNumber: 1, VRCNUM: "voter-a" }),
            mockMembership({ seatNumber: 1, VRCNUM: "voter-b" }),
          ],
        }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));

      expect(response.status).toBe(409);
      const body = await parseJsonResponse<{ error: string }>(response);
      expect(body.error).toMatch(/Data integrity error/);
    });

    it("returns 500 for unexpected errors", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockRejectedValue(
        new Error("DB connection lost"),
      );

      const response = await GET(rosterRequest({ cityTown: "Test City" }));

      await expectErrorResponse(response, 500, "Internal server error");
    });
  });
});
