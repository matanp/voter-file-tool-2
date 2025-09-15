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
} from "../../utils/testUtils";
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
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.update.mockResolvedValue(createMockVoterRecord());

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectSuccessResponse(response, "success");
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: mockCommitteeData.cityTown,
            legDistrict: parseInt(mockCommitteeData.legDistrict, 10),
            electionDistrict: parseInt(mockCommitteeData.electionDistrict, 10),
          },
        },
        include: { committeeMemberList: true },
      });
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: mockCommitteeData.memberId },
        data: {
          committeeId: null,
        },
      });
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();

      mockAuthSession(null);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 401, "Not authenticated");
    });

    it("should return 401 when user does not have admin privileges", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.ReadAccess },
      });

      mockAuthSession(mockSession);
      mockHasPermission(false);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 401, "Not authorized");
    });

    it("should return 400 for missing cityTown", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData(
        { cityTown: "" },
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
      expectErrorResponse(response, 400, "Invalid request data");
    });

    it("should return 400 for missing legDistrict", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData(
        { legDistrict: "" },
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
      expectErrorResponse(response, 400, "Invalid request data");
    });

    it("should return 400 for missing electionDistrict", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData(
        {
          electionDistrict: "",
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
      expectErrorResponse(response, 400, "Invalid request data");
    });

    it("should return 400 for missing memberId", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData(
        { memberId: "" },
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
      expectErrorResponse(response, 400, "Invalid request data");
    });

    it("should return 400 for non-integer electionDistrict", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData({
        electionDistrict: "1.5",
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid numeric fields");
    });

    it("should return 400 for non-numeric legDistrict", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData({
        legDistrict: "invalid",
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid numeric fields");
    });

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
      expectErrorResponse(response, 404, "Committee not found");
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
      expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for database error during voter record update", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.update.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 500, "Internal server error");
    });

    it("should handle numeric string conversion correctly", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData({
        legDistrict: "5",
        electionDistrict: "10",
      });
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.voterRecord.update.mockResolvedValue(createMockVoterRecord());

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectSuccessResponse(response, "success");
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: mockCommitteeData.cityTown,
            legDistrict: 5, // Should be converted to number
            electionDistrict: 10, // Should be converted to number
          },
        },
        include: { committeeMemberList: true },
      });
    });
  });
});
