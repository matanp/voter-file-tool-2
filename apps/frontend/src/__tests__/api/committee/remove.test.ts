import { POST } from "~/app/api/committee/remove/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommitteeData,
  createMockCommittee,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  validationTestCases,
  createAuthTestSuite,
  createCommitteeFindUniqueWhereArgs,
  createMockMembership,
  expectMembershipUpdate,
  getMembershipMock,
  type AuthTestConfig,
} from "../../utils/testUtils";
import type { CommitteeData } from "~/lib/validations/committee";
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

describe("/api/committee/remove", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/remove", () => {
    /** Set up mocks for a successful removal (ACTIVE membership → REMOVED). */
    const setupHappyPath = () => {
      prismaMock.committeeList.findUnique.mockResolvedValue(
        createMockCommittee(),
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "REMOVED" }),
      );
    };

    it("should successfully remove a member from a committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(response, { status: "success" });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueWhereArgs({
          cityTown: mockCommitteeData.cityTown,
          legDistrict: mockCommitteeData.legDistrict ?? LEG_DISTRICT_SENTINEL,
          electionDistrict: mockCommitteeData.electionDistrict,
        }),
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate({ status: "REMOVED" }),
      );
    });

    it("should pass removalReason and removalNotes to the membership update", async () => {
      const mockCommitteeData = {
        ...createMockCommitteeData(),
        removalReason: "OTHER" as const,
        removalNotes: "Test note",
      };
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(response, { status: "success" });
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate({
          status: "REMOVED",
          removalReason: "OTHER",
          removalNotes: "Test note",
        }),
      );
    });

    it("should handle numeric conversion correctly", async () => {
      const mockCommitteeData = createMockCommitteeData({
        legDistrict: 5,
        electionDistrict: 10,
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(response, { status: "success" });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueWhereArgs({
          cityTown: mockCommitteeData.cityTown,
          legDistrict: mockCommitteeData.legDistrict ?? LEG_DISTRICT_SENTINEL,
          electionDistrict: mockCommitteeData.electionDistrict,
        }),
      );
    });

    // Authentication tests using shared test suite
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/remove",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest(createMockCommitteeData()),
      };

      const setupMocks = () => setupHappyPath();

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    // Parameterized validation tests
    test.each([
      ...validationTestCases.missingFields,
      ...validationTestCases.invalidElectionDistrict,
    ])(
      "should return 422 for $field validation",
      async ({ field, value, expectedError }) => {
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value } as Partial<CommitteeData>,
          false,
        );
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectErrorResponse(response, 422, expectedError);
      },
    );

    test.each(validationTestCases.invalidNumeric)(
      "should return 422 for invalid numeric $field",
      async ({ field, value, expectedError }) => {
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value } as Partial<CommitteeData>,
          false,
        );
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectErrorResponse(response, 422, expectedError);
      },
    );

    it("should return 400 for negative legDistrict (sentinel value)", async () => {
      const mockCommitteeData = createMockCommitteeData(
        {
          legDistrict: LEG_DISTRICT_SENTINEL.toString() as unknown as number,
        },
        false,
      );
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("should return 404 when committee is not found", async () => {
      const mockCommitteeData = createMockCommitteeData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 404, "Committee not found");
    });

    it("should return 404 when membership is not found in this committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(
        createMockCommittee(),
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(
        response,
        404,
        "Member not found in this committee",
      );
    });

    it("should return 400 when membership exists but is not ACTIVE", async () => {
      const mockCommitteeData = createMockCommitteeData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(
        createMockCommittee(),
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "REMOVED" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(
        response,
        400,
        "Member does not have an active membership in this committee",
      );
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should return 500 for database error during committee lookup", async () => {
      const mockCommitteeData = createMockCommitteeData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for database error during membership update", async () => {
      const mockCommitteeData = createMockCommitteeData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(
        createMockCommittee(),
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );
      getMembershipMock(prismaMock).update.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 500, "Internal server error");
    });
  });
});
