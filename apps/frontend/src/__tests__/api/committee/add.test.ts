import { POST } from "~/app/api/committee/add/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommitteeData,
  createMockCommittee,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeUpsertArgs,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

// Global mocks are available from jest.setup.js

describe("/api/committee/add", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/add", () => {
    it("should successfully add a member to an existing committee", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.upsert.mockResolvedValue(mockCommittee);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.upsert).toHaveBeenCalledWith(
        createCommitteeUpsertArgs({
          cityTown: mockCommitteeData.cityTown,
          legDistrict: Number(mockCommitteeData.legDistrict),
          electionDistrict: Number(mockCommitteeData.electionDistrict),
          memberId: mockCommitteeData.memberId,
        }),
      );
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

    it("should return 500 for database error", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.upsert.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectErrorResponse(response, 500, "Internal server error");
    });

    it("should handle creating a new committee when it does not exist", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.upsert.mockResolvedValue(mockCommittee);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      expectSuccessResponse(response, mockCommittee);
      // Verify that upsert was called with both update and create operations
      expect(prismaMock.committeeList.upsert).toHaveBeenCalledWith(
        expect.objectContaining(
          createCommitteeUpsertArgs({
            cityTown: mockCommitteeData.cityTown,
            legDistrict: Number(mockCommitteeData.legDistrict),
            electionDistrict: Number(mockCommitteeData.electionDistrict),
            memberId: mockCommitteeData.memberId,
          }),
        ),
      );
    });
  });
});
