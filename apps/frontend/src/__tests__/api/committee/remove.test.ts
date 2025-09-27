import { POST } from "~/app/api/committee/remove/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommitteeData,
  createMockCommittee,
  createMockVoterRecord,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  validationTestCases,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import type { CommitteeData } from "~/lib/validations/committee";
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

// Global mocks are available from jest.setup.js

describe("/api/committee/remove", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/remove", () => {
    it("should successfully remove a member from a committee", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockVoterRecord = createMockVoterRecord();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.findUnique.mockResolvedValue(mockVoterRecord);
      prismaMock.voterRecord.update.mockResolvedValue(mockVoterRecord);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, { status: "success" });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: mockCommitteeData.cityTown,
            legDistrict: mockCommitteeData.legDistrict ?? LEG_DISTRICT_SENTINEL,
            electionDistrict: mockCommitteeData.electionDistrict,
          },
        },
      });
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: mockCommitteeData.memberId },
        data: {
          committeeId: null,
        },
      });
    });

    // Authentication tests using shared test suite
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/remove",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest(createMockCommitteeData()),
      };

      const setupMocks = () => {
        prismaMock.committeeList.findUnique.mockResolvedValue(
          createMockCommittee(),
        );
        prismaMock.voterRecord.findUnique.mockResolvedValue(
          createMockVoterRecord(),
        );
        prismaMock.voterRecord.update.mockResolvedValue(
          createMockVoterRecord(),
        );
      };

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
        // Arrange
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value } as Partial<CommitteeData>,
          false,
        );
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest(mockCommitteeData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, expectedError);
      },
    );

    test.each(validationTestCases.invalidNumeric)(
      "should return 422 for invalid numeric $field",
      async ({ field, value, expectedError }) => {
        // Arrange
        const mockCommitteeData = createMockCommitteeData(
          {
            [field]: value,
          } as Partial<CommitteeData>,
          false,
        );
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest(mockCommitteeData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, expectedError);
      },
    );

    it("should return 404 when committee is not found", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 404, "Committee not found");
    });

    it("should return 500 for database error during committee lookup", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for database error during voter record update", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockVoterRecord = createMockVoterRecord();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.findUnique.mockResolvedValue(mockVoterRecord);
      prismaMock.voterRecord.update.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should handle numeric conversion correctly", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData({
        legDistrict: 5,
        electionDistrict: 10,
      });
      const mockCommittee = createMockCommittee();
      const mockVoterRecord = createMockVoterRecord();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.findUnique.mockResolvedValue(mockVoterRecord);
      prismaMock.voterRecord.update.mockResolvedValue(mockVoterRecord);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, { status: "success" });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: mockCommitteeData.cityTown,
            legDistrict: mockCommitteeData.legDistrict ?? LEG_DISTRICT_SENTINEL,
            electionDistrict: mockCommitteeData.electionDistrict,
          },
        },
      });
    });

    it("should return 400 for negative legDistrict", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData(
        {
          legDistrict: LEG_DISTRICT_SENTINEL.toString() as unknown as number, // intentionally unsafe to test validation
        },
        false,
      );
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("should return 404 when member is not found", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.findUnique.mockResolvedValue(null);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 404, "Member not found");
    });

    it("should return 400 when member does not belong to this committee", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee({ id: 1 });
      const mockVoterRecord = createMockVoterRecord({ committeeId: 2 }); // Different committee ID
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.findUnique.mockResolvedValue(mockVoterRecord);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(
        response,
        400,
        "Member does not belong to this committee",
      );
    });
  });
});
