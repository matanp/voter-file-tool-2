/**
 * Committee Roster View — route tests for GET /api/committee/roster.
 * See docs/COMMITTEE_ROSTER_VIEW.md.
 */

import { PrivilegeLevel, Prisma } from "@prisma/client";
import { GET } from "~/app/api/committee/roster/route";
import type { RosterResponse } from "~/lib/validations/committee";
import {
  createMockSession,
  createMockRequest,
  expectErrorResponse,
  createAuthTestSuite,
  parseJsonResponse,
  getMockCallArgs,
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

function mockCommittee(overrides: {
  id?: number;
  cityTown?: string;
  legDistrict?: number;
  electionDistrict?: number;
  seats?: ReturnType<typeof mockSeat>[];
  memberships?: ReturnType<typeof mockMembership>[];
}) {
  return {
    id: overrides.id ?? 1,
    cityTown: overrides.cityTown ?? "Test City",
    legDistrict: overrides.legDistrict ?? 1,
    electionDistrict: overrides.electionDistrict ?? 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seats: overrides.seats ?? [],
    memberships: overrides.memberships ?? [],
  };
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

describe("GET /api/committee/roster", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCommitteeListMock().findMany.mockResolvedValue([]);
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
        getCommitteeListMock().findMany.mockResolvedValue([]);
        getUserJurisdictionMock().findMany.mockResolvedValue([
          { cityTown: "Test City", legDistrict: 1 },
        ]);
      },
    );

    for (const { description, runTest } of authSuite) {
      it(description, runTest);
    }
  });

  // -------------------------------------------------------------------------
  // Query validation
  // -------------------------------------------------------------------------
  describe("query validation", () => {
    it("returns 400 when cityTown is missing", async () => {
      adminSession();
      const response = await GET(rosterRequest({}));
      await expectErrorResponse(response, 400, "City/Town is required");
      expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
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
      const response = await GET(
        rosterRequest({ cityTown: "ROCHESTER", legDistrict: "21" }),
      );
      expect(response.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Jurisdiction filtering
  // -------------------------------------------------------------------------
  describe("jurisdiction filtering", () => {
    it("applies no jurisdiction OR-filter for Admin", async () => {
      adminSession();
      await GET(rosterRequest({ cityTown: "Test City" }));

      expect(getUserJurisdictionMock().findMany).not.toHaveBeenCalled();
      const args = getMockCallArgs(getCommitteeListMock().findMany)[0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        cityTown: "Test City",
      });
    });

    it("ANDs a mixed all-LD + specific-LD OR-filter for Leader", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Greece", legDistrict: null }, // all LDs in Greece
        { cityTown: "ROCHESTER", legDistrict: 21 }, // only LD 21
      ]);

      await GET(rosterRequest({ cityTown: "Greece" }));

      const args = getMockCallArgs(getCommitteeListMock().findMany)[0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        cityTown: "Greece",
        OR: [
          { cityTown: "Greece" },
          { cityTown: "ROCHESTER", legDistrict: 21 },
        ],
      });
    });

    it("matches nothing for a Leader with no jurisdictions (OR: [])", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));

      const args = getMockCallArgs(getCommitteeListMock().findMany)[0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({
        termId: DEFAULT_ACTIVE_TERM_ID,
        cityTown: "Test City",
        OR: [],
      });
      const body = await parseJsonResponse<RosterResponse>(response);
      expect(body.rows).toEqual([]);
      expect(body.summary.edCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Term scoping
  // -------------------------------------------------------------------------
  describe("term scoping", () => {
    it("scopes the query and active memberships to the active term", async () => {
      adminSession();
      await GET(rosterRequest({ cityTown: "Test City" }));

      const args = getMockCallArgs(getCommitteeListMock().findMany)[0] as {
        where: { termId: string };
        include: {
          memberships: { where: { status: string; termId: string } };
        };
      };
      expect(args.where.termId).toBe(DEFAULT_ACTIVE_TERM_ID);
      expect(args.include.memberships.where).toEqual({
        status: "ACTIVE",
        termId: DEFAULT_ACTIVE_TERM_ID,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Row construction
  // -------------------------------------------------------------------------
  describe("row construction", () => {
    it("emits vacant rows for unoccupied seats", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
        mockCommittee({
          seats: [
            mockSeat({ seatNumber: 1 }),
            mockSeat({ seatNumber: 2 }),
          ],
          memberships: [mockMembership({ seatNumber: 1 })],
        }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      expect(body.rows).toHaveLength(2);
      const seat2 = body.rows.find((r) => r.seatNumber === 2);
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
      getCommitteeListMock().findMany.mockResolvedValue([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 })],
          memberships: [],
        }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      expect(body.rows[0]?.petitionedVacant).toBe(true);
      expect(body.rows[0]?.weight).toBe("0.25");
    });

    it("synthesizes maxSeatsPerLted vacant seats when seats is empty", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
        mockCommittee({ seats: [], memberships: [] }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      // maxSeatsPerLted default is 4 in the test governance config.
      expect(body.rows).toHaveLength(4);
      expect(body.rows.map((r) => r.seatNumber)).toEqual([1, 2, 3, 4]);
      expect(body.rows.every((r) => r.occupant === null)).toBe(true);
      expect(body.summary.totalSeats).toBe(4);
    });

    it("emits unassigned rows and counts them outside filled", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
        mockCommittee({
          seats: [
            mockSeat({ seatNumber: 1 }),
            mockSeat({ seatNumber: 2 }),
            mockSeat({ seatNumber: 3 }),
            mockSeat({ seatNumber: 4 }),
          ],
          memberships: [
            mockMembership({ seatNumber: null, VRCNUM: "unassigned-1" }),
          ],
        }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      const unassignedRows = body.rows.filter((r) => r.unassigned);
      expect(unassignedRows).toHaveLength(1);
      expect(unassignedRows[0]?.seatNumber).toBeNull();
      expect(unassignedRows[0]?.occupant?.VRCNUM).toBe("unassigned-1");

      // 0 occupied seats, 1 unassigned member.
      expect(body.summary.filled).toBe(0);
      expect(body.summary.unassignedCount).toBe(1);
      expect(body.edRollups[0]).toMatchObject({
        filled: 0,
        totalSeats: 4,
        unassignedCount: 1,
      });
    });

    it("populates missingWeightSeatNumbers for petitioned seats lacking weight", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
        mockCommittee({
          seats: [
            mockSeat({ seatNumber: 1, isPetitioned: true, weight: null }),
            mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
          ],
          memberships: [],
        }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      expect(body.edRollups[0]?.missingWeightSeatNumbers).toEqual([1]);
    });
  });

  // -------------------------------------------------------------------------
  // Contact / PII gating
  // -------------------------------------------------------------------------
  describe("contact gating", () => {
    it("includes contact for Admin, using voterRecord.telephone fallback", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
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

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      expect(body.rows[0]?.contact).toEqual({
        email: "voter@example.com",
        phone: "585-555-0100",
      });
    });

    it("prefers submissionMetadata contact over voterRecord for Admin", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
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

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      expect(body.rows[0]?.contact).toEqual({
        email: "voter@example.com",
        phone: "585-555-9999",
      });
    });

    it("omits contact for Leader", async () => {
      leaderSession();
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Test City", legDistrict: null },
      ]);
      getCommitteeListMock().findMany.mockResolvedValue([
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [
            mockMembership({ seatNumber: 1, telephone: "585-555-0100" }),
          ],
        }),
      ]);

      const response = await GET(rosterRequest({ cityTown: "Test City" }));
      const body = await parseJsonResponse<RosterResponse>(response);

      expect(body.rows[0]?.occupant).not.toBeNull();
      expect(body.rows[0]?.contact).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Data integrity
  // -------------------------------------------------------------------------
  describe("data integrity", () => {
    it("returns 409 when two active memberships claim the same seat", async () => {
      adminSession();
      getCommitteeListMock().findMany.mockResolvedValue([
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
