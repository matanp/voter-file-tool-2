import { POST } from "~/app/api/committee/add/route";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import {
  createMockSession,
  createMockCommitteeData,
  createMockCommittee,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeUpsertArgs,
  createMockGovernanceConfig,
  createMockMembership,
  expectMembershipCreate,
  expectMembershipUpdate,
  getMembershipMock,
  validationTestCases,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

describe("/api/committee/add", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/add", () => {
    /** Set up mocks for the full happy-path (new membership created). */
    const setupHappyPath = () => {
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );
    };

    it("should successfully add a member to a committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(prismaMock.committeeList.upsert).toHaveBeenCalledWith(
        createCommitteeUpsertArgs({
          cityTown: mockCommitteeData.cityTown,
          legDistrict: Number(mockCommitteeData.legDistrict),
          electionDistrict: Number(mockCommitteeData.electionDistrict),
        }),
      );
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
    });

    it("should store PETITIONED when membershipType is provided", async () => {
      const mockCommitteeData = createMockCommitteeData({
        membershipType: "PETITIONED",
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          membershipType: "PETITIONED",
          seatNumber: 1,
        }),
      );
    });

    it("should re-activate an existing non-active membership instead of creating", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      // Existing REJECTED membership → should be re-activated via update
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "REJECTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate({
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 200 idempotent when member is already ACTIVE in this committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Member already active in this committee",
          idempotent: true,
        },
        200,
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should return 400 when member is already ACTIVE in another committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      // Voter is ACTIVE in committee id 999 (different from target id 1)
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(
        createMockMembership({ committeeListId: 999, status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(
        response,
        400,
        "Member is already in another committee",
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 400 when committee is at capacity", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(4); // at capacity

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 400, "Committee is at capacity");
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 404 when member not found (P2025)", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Record not found", {
          code: "P2025",
          clientVersion: "5.0.0",
        }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 404, "Member not found");
    });

    it("should return 200 idempotent for P2002 (unique constraint)", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "5.0.0",
        }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Member already connected to committee (idempotent)",
          idempotent: true,
        },
        200,
      );
    });

    it("should return 500 for generic database error", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for non-P2025 PrismaClientKnownRequestError", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Some DB error", {
          code: "P2000",
          clientVersion: "5.0.0",
        }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    // Parameterized validation tests
    test.each([
      ...validationTestCases.missingFields,
      ...validationTestCases.invalidElectionDistrict,
    ])(
      "should return 422 for $field validation failure",
      async ({ field, value, expectedError }) => {
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value },
          false,
        );
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectErrorResponse(response, 422, expectedError);
        expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
      },
    );

    test.each(validationTestCases.invalidNumeric)(
      "should return 422 for invalid numeric $field",
      async ({ field, value, expectedError }) => {
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value },
          false,
        );
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectErrorResponse(response, 422, expectedError);
        expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
      },
    );

    // Authentication tests
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/add",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest(createMockCommitteeData()),
      };

      const setupMocks = () => {
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig(),
        );
        prismaMock.committeeList.upsert.mockResolvedValue(
          createMockCommittee(),
        );
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
        getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
        getMembershipMock(prismaMock).count.mockResolvedValue(0);
        getMembershipMock(prismaMock).create.mockResolvedValue(
          createMockMembership({ status: "ACTIVE" }),
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
        200,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });
  });
});
