import { POST } from "~/app/api/committee/requestAdd/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  createMockCommitteeRequest,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeFindUniqueArgs,
  createCommitteeRequestCreateArgs,
  validationTestCases,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

// Global mocks are available from jest.setup.js

describe("/api/committee/requestAdd", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/requestAdd", () => {
    const createMockRequestData = (overrides = {}) => ({
      cityTown: "Test City",
      legDistrict: "1",
      electionDistrict: 1,
      addMemberId: "TEST123456",
      removeMemberId: null,
      requestNotes: "Test request notes",
      ...overrides,
    });

    it("should successfully create a committee request with add member", async () => {
      // Arrange
      const mockRequestData = createMockRequestData();
      const mockCommittee = createMockCommittee();
      const mockCommitteeRequest = createMockCommitteeRequest();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeRequest.create.mockResolvedValue(
        mockCommitteeRequest,
      );

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, {
        status: "success",
        message: "Request created",
      });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: mockRequestData.cityTown,
          legDistrict: Number(mockRequestData.legDistrict),
          electionDistrict: Number(mockRequestData.electionDistrict),
          include: { committeeMemberList: false },
        }),
      );
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: mockRequestData.addMemberId,
          removeVoterRecordId: undefined,
          requestNotes: mockRequestData.requestNotes,
        }),
      );
    });

    it("should successfully create a committee request with remove member", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({
        addMemberId: null,
        removeMemberId: "TEST123456",
      });
      const mockCommittee = createMockCommittee();
      const mockCommitteeRequest = createMockCommitteeRequest();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeRequest.create.mockResolvedValue(
        mockCommitteeRequest,
      );

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, {
        status: "success",
        message: "Request created",
      });
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: undefined,
          removeVoterRecordId: mockRequestData.removeMemberId,
          requestNotes: mockRequestData.requestNotes,
        }),
      );
    });

    it("should successfully create a committee request with both add and remove members", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({
        addMemberId: "TEST123456",
        removeMemberId: "TEST789012",
      });
      const mockCommittee = createMockCommittee();
      const mockCommitteeRequest = createMockCommitteeRequest();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeRequest.create.mockResolvedValue(
        mockCommitteeRequest,
      );

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, {
        status: "success",
        message: "Request created",
      });
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: mockRequestData.addMemberId,
          removeVoterRecordId: mockRequestData.removeMemberId,
          requestNotes: mockRequestData.requestNotes,
        }),
      );
    });

    // Authentication tests using shared test suite
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/requestAdd",
        requiredPrivilege: PrivilegeLevel.RequestAccess,
        mockRequest: () => createMockRequest(createMockRequestData()),
      };

      const setupMocks = () => {
        prismaMock.committeeList.findUnique.mockResolvedValue(
          createMockCommittee(),
        );
        prismaMock.committeeRequest.create.mockResolvedValue(
          createMockCommitteeRequest(),
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

    test.each([
      {
        description: "missing cityTown",
        requestDataOverrides: { cityTown: "" },
      },
      {
        description: "missing legDistrict",
        requestDataOverrides: { legDistrict: "" },
      },
      {
        description: "missing electionDistrict",
        requestDataOverrides: { electionDistrict: null },
      },
      {
        description: "non-integer electionDistrict",
        requestDataOverrides: { electionDistrict: 1.5 },
      },
      {
        description: "non-numeric legDistrict",
        requestDataOverrides: { legDistrict: "invalid" },
      },
    ])(
      "should return 400 for $description",
      async ({ requestDataOverrides }) => {
        // Arrange
        const mockRequestData = createMockRequestData(requestDataOverrides);
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.RequestAccess },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest(mockRequestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 400, "Invalid request");
      },
    );

    // Request notes validation tests
    describe.each(validationTestCases.invalidRequestNotes)(
      "should return 400 for invalid requestNotes",
      ({ field, value, expectedError }) => {
        it(`should return 400 for ${field} = "${value}"`, async () => {
          // Arrange
          const mockRequestData = createMockRequestData({
            [field]: value,
          });
          const mockSession = createMockSession({
            user: { privilegeLevel: PrivilegeLevel.RequestAccess },
          });

          mockAuthSession(mockSession);
          mockHasPermission(true);

          const request = createMockRequest(mockRequestData);

          // Act
          const response = await POST(request);

          // Assert
          await expectErrorResponse(response, 400, expectedError);
        });
      },
    );

    it("should return 404 when committee is not found", async () => {
      // Arrange
      const mockRequestData = createMockRequestData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 404, "Committee not found");
    });

    it("should return 500 for database error during committee lookup", async () => {
      // Arrange
      const mockRequestData = createMockRequestData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for database error during request creation", async () => {
      // Arrange
      const mockRequestData = createMockRequestData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeRequest.create.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should handle empty addMemberId and removeMemberId", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({
        addMemberId: null,
        removeMemberId: null,
      });
      const mockCommittee = createMockCommittee();
      const mockCommitteeRequest = createMockCommitteeRequest();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeRequest.create.mockResolvedValue(
        mockCommitteeRequest,
      );

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, {
        status: "success",
        message: "Request created",
      });
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: undefined,
          removeVoterRecordId: undefined,
          requestNotes: mockRequestData.requestNotes,
        }),
      );
    });
  });
});
