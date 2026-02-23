/**
 * SRS 2.7 — Route tests for GET /api/committee/designationWeight.
 */

import { PrivilegeLevel, Prisma } from "@prisma/client";
import { GET } from "~/app/api/committee/designationWeight/route";
import {
  createMockSession,
  createMockRequest,
  expectErrorResponse,
  createAuthTestSuite,
  parseJsonResponse,
  DEFAULT_ACTIVE_TERM_ID,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

type SeatMock = { findMany: jest.Mock };
type MembershipMock = { findMany: jest.Mock; findFirst: jest.Mock };
type CommitteeListMock = { findUnique: jest.Mock };

function getSeatMock(): SeatMock {
  return prismaMock.seat as unknown as SeatMock;
}

function getMembershipMock(): MembershipMock {
  return (prismaMock as unknown as { committeeMembership: MembershipMock })
    .committeeMembership;
}

function getCommitteeListMock(): CommitteeListMock {
  return (prismaMock as unknown as { committeeList: CommitteeListMock })
    .committeeList;
}

function getUserJurisdictionMock(): { findMany: jest.Mock } {
  return (prismaMock as unknown as { userJurisdiction: { findMany: jest.Mock } })
    .userJurisdiction;
}

function mockSeat(overrides: {
  seatNumber: number;
  isPetitioned?: boolean;
  weight?: number | null;
}) {
  return {
    id: `seat-${String(overrides.seatNumber)}`,
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seatNumber: overrides.seatNumber,
    isPetitioned: overrides.isPetitioned ?? false,
    weight:
      overrides.weight != null
        ? new Prisma.Decimal(overrides.weight)
        : null,
  };
}

function mockActiveMembership(overrides: {
  seatNumber: number;
  membershipType?: string;
}) {
  return {
    seatNumber: overrides.seatNumber,
    membershipType: overrides.membershipType ?? "PETITIONED",
    voterRecordId: `voter-${String(overrides.seatNumber)}`,
  };
}

describe("GET /api/committee/designationWeight", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Auth tests
  // ---------------------------------------------------------------------------
  describe("authentication and authorization", () => {
    const setupMocks = () => {
      getSeatMock().findMany.mockResolvedValue([]);
      getMembershipMock().findMany.mockResolvedValue([]);
      getCommitteeListMock().findUnique.mockResolvedValue({
        id: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
      });
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Test City", legDistrict: 1 },
      ]);
    };

    const authSuite = createAuthTestSuite(
      {
        endpointName: "GET /api/committee/designationWeight",
        requiredPrivilege: PrivilegeLevel.Leader,
        mockRequest: () =>
          createMockRequest(
            {},
            { committeeListId: "1" },
            { method: "GET" },
          ),
      },
      GET as (req: Parameters<typeof GET>[0]) => Promise<Response>,
      mockAuthSession,
      mockHasPermission,
      setupMocks,
    );

    for (const { description, runTest } of authSuite) {
      it(description, runTest);
    }
  });

  // ---------------------------------------------------------------------------
  // Validation tests
  // ---------------------------------------------------------------------------
  describe("query param validation", () => {
    it("returns 422 when committeeListId is missing", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const response = await GET(
        createMockRequest({}, {}, { method: "GET" }),
      );

      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("returns 422 when committeeListId is not a positive integer", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const response = await GET(
        createMockRequest({}, { committeeListId: "-1" }, { method: "GET" }),
      );

      await expectErrorResponse(response, 422, "Invalid request data");
    });
  });

  // ---------------------------------------------------------------------------
  // Success response
  // ---------------------------------------------------------------------------
  describe("successful response", () => {
    it("returns per-seat breakdown and totals", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      getSeatMock().findMany.mockResolvedValue([
        mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
        mockSeat({ seatNumber: 2, isPetitioned: false, weight: 0.25 }),
      ]);
      getMembershipMock().findMany.mockResolvedValue([
        mockActiveMembership({ seatNumber: 1 }),
      ]);

      const response = await GET(
        createMockRequest({}, { committeeListId: "1" }, { method: "GET" }),
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{
        success: boolean;
        totalWeight: number;
        totalContributingSeats: number;
        seats: unknown[];
        missingWeightSeatNumbers: number[];
      }>(response);

      expect(body.success).toBe(true);
      expect(body.totalWeight).toBe(0.25);
      expect(body.totalContributingSeats).toBe(1);
      expect(body.seats).toHaveLength(2);
      expect(body.missingWeightSeatNumbers).toEqual([]);
    });

    it("allows leader access when jurisdiction scope is permitted", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Leader } }),
      );
      mockHasPermission(true);

      getCommitteeListMock().findUnique.mockResolvedValue({
        id: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
      });
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Test City", legDistrict: 1 },
      ]);
      getSeatMock().findMany.mockResolvedValue([
        mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
      ]);
      getMembershipMock().findMany.mockResolvedValue([
        mockActiveMembership({ seatNumber: 1, membershipType: "APPOINTED" }),
      ]);

      const response = await GET(
        createMockRequest({}, { committeeListId: "1" }, { method: "GET" }),
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ success: boolean }>(response);
      expect(body.success).toBe(true);
    });

    it("accepts optional termId parameter", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      getSeatMock().findMany.mockResolvedValue([]);
      getMembershipMock().findMany.mockResolvedValue([]);

      const response = await GET(
        createMockRequest(
          {},
          { committeeListId: "1", termId: "custom-term-id" },
          { method: "GET" },
        ),
      );

      expect(response.status).toBe(200);
      expect(getSeatMock().findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { committeeListId: 1, termId: "custom-term-id" },
        }) as unknown,
      );
    });
  });

  describe("leader jurisdiction scope", () => {
    it("returns 403 when leader is outside permitted jurisdictions", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Leader } }),
      );
      mockHasPermission(true);

      getCommitteeListMock().findUnique.mockResolvedValue({
        id: 1,
        cityTown: "Other City",
        legDistrict: 3,
        termId: DEFAULT_ACTIVE_TERM_ID,
      });
      getUserJurisdictionMock().findMany.mockResolvedValue([
        { cityTown: "Different City", legDistrict: 1 },
      ]);

      const response = await GET(
        createMockRequest({}, { committeeListId: "1" }, { method: "GET" }),
      );

      await expectErrorResponse(
        response,
        403,
        "User does not have jurisdiction access for this committee",
      );
      expect(getSeatMock().findMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe("error handling", () => {
    it("returns 409 for data integrity errors", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      getSeatMock().findMany.mockResolvedValue([
        mockSeat({ seatNumber: 1, isPetitioned: true, weight: 0.25 }),
      ]);
      getMembershipMock().findMany.mockResolvedValue([
        mockActiveMembership({ seatNumber: 1 }),
        { seatNumber: 1, membershipType: "APPOINTED", voterRecordId: "voter-dup" },
      ]);

      const response = await GET(
        createMockRequest({}, { committeeListId: "1" }, { method: "GET" }),
      );

      expect(response.status).toBe(409);
      const body = await parseJsonResponse<{ success: boolean; error: string }>(
        response,
      );
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/Data integrity error/);
    });

    it("returns 500 for unexpected errors", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      getSeatMock().findMany.mockRejectedValue(new Error("DB connection lost"));

      const response = await GET(
        createMockRequest({}, { committeeListId: "1" }, { method: "GET" }),
      );

      expect(response.status).toBe(500);
      const body = await parseJsonResponse<{ success: boolean; error: string }>(
        response,
      );
      expect(body.success).toBe(false);
      expect(body.error).toBe("Internal server error");
    });
  });
});
