import { POST } from "~/app/api/committee/handleRequest/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createEmptyCommitteeMock,
  createFullCommitteeMock,
  createCommitteeWithMemberMock,
  createMockVoterRecord,
  expectSuccessResponse,
  expectErrorResponse,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

// Mock committee request data
const createMockCommitteeRequest = (overrides = {}) => ({
  id: 1,
  committeeListId: 1,
  addVoterRecordId: "TEST123456",
  removeVoterRecordId: null,
  requestNotes: "Test request",
  committeList: {
    id: 1,
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
    committeeMemberList: [
      {
        VRCNUM: "EXISTING123",
        firstName: "Existing",
        lastName: "Member",
      },
    ],
  },
  ...overrides,
});

describe("/api/committee/handleRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/handleRequest", () => {
    // Authentication tests using shared test suite
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/handleRequest",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest({
            committeeRequestId: 1,
            acceptOrReject: "accept",
          }),
      };

      const setupMocks = () => {
        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          createMockCommitteeRequest(),
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeRequest.delete.mockResolvedValue({
          id: 1,
          committeeListId: 1,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: null,
          requestNotes: "Test request",
        });
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

    describe("Validation tests", () => {
      it("should return 422 for missing committeeRequestId", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest({
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, "Invalid request data");
      });

      it("should return 422 for missing acceptOrReject", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest({
          committeeRequestId: 1,
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, "Invalid request data");
      });

      it("should return 422 for invalid acceptOrReject value", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "invalid",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, "Invalid request data");
      });

      it("should return 422 for invalid committeeRequestId", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest({
          committeeRequestId: "invalid",
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 422, "Invalid request data");
      });
    });

    describe("Business logic tests", () => {
      it("should return 404 when committee request not found", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.committeeRequest.findUnique.mockResolvedValue(null);

        const request = createMockRequest({
          committeeRequestId: 999,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 404, "Committee request not found");
      });

      it("should successfully accept a request with add member only", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest({
          addVoterRecordId: "NEW123456",
          removeVoterRecordId: null,
          committeList: createEmptyCommitteeMock(),
        });

        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeRequest.delete.mockResolvedValue({
          id: 1,
          committeeListId: 1,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: null,
          requestNotes: "Test request",
        });

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, { message: "Request accepted" });
        expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            committeeMemberList: {
              connect: { VRCNUM: "NEW123456" },
            },
          },
        });
        expect(prismaMock.committeeRequest.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it("should successfully accept a request with remove member only", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest({
          addVoterRecordId: null,
          removeVoterRecordId: "REMOVE123",
          committeList: createCommitteeWithMemberMock(),
        });

        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeRequest.delete.mockResolvedValue({
          id: 1,
          committeeListId: 1,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: null,
          requestNotes: "Test request",
        });

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, { message: "Request accepted" });
        expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            committeeMemberList: {
              disconnect: { VRCNUM: "REMOVE123" },
            },
          },
        });
        expect(prismaMock.committeeRequest.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it("should successfully accept a request with both add and remove members", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest({
          addVoterRecordId: "NEW123456",
          removeVoterRecordId: "REMOVE123",
          committeList: {
            ...createCommitteeWithMemberMock(),
            committeeMemberList: [
              createMockVoterRecord({ VRCNUM: "REMOVE123" }),
            ],
          },
        });

        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeRequest.delete.mockResolvedValue({
          id: 1,
          committeeListId: 1,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: null,
          requestNotes: "Test request",
        });

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, { message: "Request accepted" });
        expect(prismaMock.committeeList.update).toHaveBeenCalledTimes(2);
        expect(prismaMock.committeeRequest.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it("should handle committee capacity limit when adding member to full committee", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest({
          addVoterRecordId: "NEW123456",
          removeVoterRecordId: null,
          committeList: createFullCommitteeMock(),
        });

        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeRequest.delete.mockResolvedValue({
          id: 1,
          committeeListId: 1,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: null,
          requestNotes: "Test request",
        });

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            message:
              "Request processed - Committee already full, no changes made",
          },
          200,
        );
        expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
        expect(prismaMock.committeeRequest.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it("should successfully reject a request", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest();
        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeRequest.delete.mockResolvedValue({
          id: 1,
          committeeListId: 1,
          addVoterRecordId: "TEST123456",
          removeVoterRecordId: null,
          requestNotes: "Test request",
        });

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "reject",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, { message: "Request rejected" });
        expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
        expect(prismaMock.committeeRequest.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });
    });

    describe("Error handling tests", () => {
      it("should return 500 when database findUnique fails", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.committeeRequest.findUnique.mockRejectedValue(
          new Error("Database error"),
        );

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });

      it("should return 500 when database update fails", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest({
          addVoterRecordId: "NEW123456",
          removeVoterRecordId: null,
          committeList: createEmptyCommitteeMock(),
        });

        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeList.update.mockRejectedValue(
          new Error("Database error"),
        );

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "accept",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });

      it("should return 500 when database delete fails", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);

        const mockCommitteeRequest = createMockCommitteeRequest();
        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          mockCommitteeRequest,
        );
        prismaMock.committeeRequest.delete.mockRejectedValue(
          new Error("Database error"),
        );

        const request = createMockRequest({
          committeeRequestId: 1,
          acceptOrReject: "reject",
        });

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });
    });
  });
});
