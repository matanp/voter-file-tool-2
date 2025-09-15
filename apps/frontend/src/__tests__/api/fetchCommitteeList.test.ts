import { GET } from "~/app/api/fetchCommitteeList/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeFindUniqueArgs,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

// Global mocks are available from jest.setup.js

describe("/api/fetchCommitteeList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/fetchCommitteeList", () => {
    it("should return committee data for valid request with admin privileges", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        }),
      );
    });

    it("should return 400 for missing electionDistrict parameter", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid election district");
    });

    it("should return 400 for invalid electionDistrict parameter", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=invalid&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid election district");
    });

    it("should return 400 for missing cityTown parameter", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid election district");
    });

    it("should return 400 for non-integer electionDistrict", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1.5&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectErrorResponse(response, 400, "Invalid election district");
    });

    it("should return 404 when committee is not found", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectErrorResponse(response, 404, "Committee not found");
    });

    it("should return 500 for database error", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectErrorResponse(response, 500, "Internal server error");
    });

    it("should handle legDistrict as optional parameter", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: -1, // Should default to -1 when not provided
          electionDistrict: 1,
        }),
      );
    });

    it("should handle duplicate electionDistrict parameters correctly", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      // Simulate duplicate parameters (URLSearchParams.get() returns first value)
      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&electionDistrict=2&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      expectSuccessResponse(response, mockCommittee);
    });
  });
});
