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
      expectSuccessResponse(response, {
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
      expectSuccessResponse(response, {
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
      expectSuccessResponse(response, {
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

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockRequestData = createMockRequestData();

      mockAuthSession(null);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 401, "Not authenticated");
    });

    it("should return 401 when user does not have request access privileges", async () => {
      // Arrange
      const mockRequestData = createMockRequestData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.ReadAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(false);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 401, "Not authorized");
    });

    it("should return 400 for missing cityTown", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({ cityTown: "" });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid request");
    });

    it("should return 400 for missing legDistrict", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({ legDistrict: "" });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid request");
    });

    it("should return 400 for missing electionDistrict", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({ electionDistrict: null });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid request");
    });

    it("should return 400 for non-integer electionDistrict", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({ electionDistrict: 1.5 });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid request");
    });

    it("should return 400 for non-numeric legDistrict", async () => {
      // Arrange
      const mockRequestData = createMockRequestData({ legDistrict: "invalid" });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.RequestAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockRequestData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid request");
    });

    it("should return 500 when committee is not found", async () => {
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
      expectErrorResponse(response, 500, "Internal server error");
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
      expectErrorResponse(response, 500, "Internal server error");
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
      expectErrorResponse(response, 500, "Internal server error");
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
      expectSuccessResponse(response, {
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
