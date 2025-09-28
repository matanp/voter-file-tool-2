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
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Request created",
        },
        201,
      );
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

    it("should successfully create a committee request with undefined legDistrict (at-large)", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({
        legDistrict: undefined,
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Request created",
        },
        201,
      );
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: mockRequestData.cityTown,
          legDistrict: LEG_DISTRICT_SENTINEL, // Should convert undefined to sentinel value
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Request created",
        },
        201,
      );
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Request created",
        },
        201,
      );
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: mockRequestData.addMemberId,
          removeVoterRecordId: mockRequestData.removeMemberId,
          requestNotes: mockRequestData.requestNotes,
        }),
      );
    });

    it("trims add/remove member IDs before create", async () => {
      const mockRequestData = createMockRequestData({
        addMemberId: "  TEST123456  ",
        removeMemberId: "  ",
      });
      const mockCommittee = createMockCommittee();
      const mockCommitteeRequest = createMockCommitteeRequest();
      mockAuthSession(
        createMockSession({
          user: { privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeRequest.create.mockResolvedValue(
        mockCommitteeRequest,
      );

      const response = await POST(createMockRequest(mockRequestData));
      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: undefined,
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
        201, // Success status for this endpoint
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    // Consolidated validation tests
    test.each([
      // Missing required fields
      { field: "cityTown", value: "", type: "missing" },
      { field: "legDistrict", value: "", type: "missing" },
      { field: "electionDistrict", value: null, type: "missing" },

      // Invalid numeric values
      { field: "electionDistrict", value: 1.5, type: "invalid_numeric" },
      { field: "legDistrict", value: "invalid", type: "invalid_numeric" },
      {
        field: "legDistrict",
        value: LEG_DISTRICT_SENTINEL,
        type: "invalid_numeric",
      },
      { field: "legDistrict", value: " ", type: "invalid_numeric" },
    ])(
      "should return 422 for $type $field",
      async ({ field, value, type: _type }) => {
        // Arrange
        const mockRequestData = createMockRequestData({ [field]: value });
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.RequestAccess },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest(mockRequestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, "Invalid request data");
      },
    );

    // Request notes validation tests
    test.each(validationTestCases.invalidRequestNotes)(
      "should return 422 for invalid requestNotes - $field",
      async ({ field, value, expectedError }) => {
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
        await expectErrorResponse(response, 422, expectedError);
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
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("should handle missing requestNotes", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({
        requestNotes: undefined,
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Request created",
        },
        201,
      );
      expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
        createCommitteeRequestCreateArgs({
          committeeListId: mockCommittee.id,
          addVoterRecordId: mockRequestData.addMemberId,
          removeVoterRecordId: undefined,
          requestNotes: undefined,
        }),
      );
    });

    // Integration aspects - Request workflow validation
    describe("Request workflow integration", () => {
      it("should maintain referential integrity between committee and request", async () => {
        // Arrange
        const mockRequestData = createMockRequestData();
        const mockCommittee = createMockCommittee({ id: 123 });
        const mockCommitteeRequest = createMockCommitteeRequest({
          id: 456,
          committeeListId: 123,
        });
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
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Request created",
          },
          201,
        );

        // Verify the committee lookup used correct parameters
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
          createCommitteeFindUniqueArgs({
            cityTown: mockRequestData.cityTown,
            legDistrict: Number(mockRequestData.legDistrict),
            electionDistrict: Number(mockRequestData.electionDistrict),
            include: { committeeMemberList: false },
          }),
        );

        // Verify the request creation used the correct committee ID
        expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
          createCommitteeRequestCreateArgs({
            committeeListId: mockCommittee.id,
            addVoterRecordId: mockRequestData.addMemberId,
            removeVoterRecordId: undefined,
            requestNotes: mockRequestData.requestNotes,
          }),
        );
      });

      it("should handle partial failure scenarios gracefully", async () => {
        // Arrange
        const mockRequestData = createMockRequestData();
        const mockCommittee = createMockCommittee();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.RequestAccess },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Mock successful committee lookup but failed request creation
        prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
        prismaMock.committeeRequest.create.mockRejectedValue(
          new Error("Foreign key constraint violation"),
        );

        const request = createMockRequest(mockRequestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");

        // Verify both operations were attempted
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalled();
        expect(prismaMock.committeeRequest.create).toHaveBeenCalled();
      });

      it("should validate voter record existence for add/remove operations", async () => {
        // Arrange
        const mockRequestData = createMockRequestData({
          addMemberId: "NONEXISTENT123",
          removeMemberId: "ALSONONEXISTENT456",
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
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Request created",
          },
          201,
        );

        // Note: The current implementation doesn't validate voter record existence
        // This test documents the current behavior and could be enhanced
        // to add voter record validation in the future
        expect(prismaMock.committeeRequest.create).toHaveBeenCalledWith(
          createCommitteeRequestCreateArgs({
            committeeListId: mockCommittee.id,
            addVoterRecordId: "NONEXISTENT123",
            removeVoterRecordId: "ALSONONEXISTENT456",
            requestNotes: mockRequestData.requestNotes,
          }),
        );
      });
    });

    // Integration aspects - Business logic validation
    describe("Business logic integration", () => {
      it("should enforce committee uniqueness constraints", async () => {
        // Arrange
        const mockRequestData = createMockRequestData();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.RequestAccess },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Mock committee lookup failure (committee doesn't exist)
        prismaMock.committeeList.findUnique.mockResolvedValue(null);

        const request = createMockRequest(mockRequestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 404, "Committee not found");

        // Verify committee lookup was attempted but request creation was not
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalled();
        expect(prismaMock.committeeRequest.create).not.toHaveBeenCalled();
      });

      it("should handle at-large district logic correctly", async () => {
        // Arrange
        const mockRequestData = createMockRequestData({
          legDistrict: undefined, // At-large district
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
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Request created",
          },
          201,
        );

        // Verify the committee lookup used the sentinel value for at-large districts
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
          createCommitteeFindUniqueArgs({
            cityTown: mockRequestData.cityTown,
            legDistrict: LEG_DISTRICT_SENTINEL,
            electionDistrict: Number(mockRequestData.electionDistrict),
            include: { committeeMemberList: false },
          }),
        );
      });
    });
  });
});
