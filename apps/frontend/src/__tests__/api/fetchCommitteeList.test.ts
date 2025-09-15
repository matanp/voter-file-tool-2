import { GET } from "~/app/api/fetchCommitteeList/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeFindUniqueArgs,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

// Global mocks are available from jest.setup.js

describe("/api/fetchCommitteeList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/fetchCommitteeList", () => {
    // Authentication tests using shared test suite
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/fetchCommitteeList",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          new NextRequest(
            "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
          ),
      };

      const setupMocks = () => {
        prismaMock.committeeList.findUnique.mockResolvedValue(
          createMockCommittee(),
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        GET,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

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
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        }),
      );
    });

    describe.each([
      {
        param: "electionDistrict",
        value: "",
        error: "Invalid request data",
        url: "http://localhost:3000/api/fetchCommitteeList?cityTown=Test%20City&legDistrict=1",
      },
      {
        param: "electionDistrict",
        value: "invalid",
        error: "Invalid request data",
        url: "http://localhost:3000/api/fetchCommitteeList?electionDistrict=invalid&cityTown=Test%20City&legDistrict=1",
      },
      {
        param: "cityTown",
        value: "",
        error: "Invalid request data",
        url: "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&legDistrict=1",
      },
      {
        param: "electionDistrict",
        value: "1.5",
        error: "Invalid request data",
        url: "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1.5&cityTown=Test%20City&legDistrict=1",
      },
    ])(
      "should return 400 for $param validation",
      ({ param, value, error, url }) => {
        it(`should return 400 for ${param} = "${value}"`, async () => {
          // Arrange
          const mockSession = createMockSession({
            user: { privilegeLevel: PrivilegeLevel.Admin },
          });

          mockAuthSession(mockSession);
          mockHasPermission(true);

          const request = new NextRequest(url);

          // Act
          const response = await GET(request);

          // Assert
          await expectErrorResponse(response, 422, error);
          expect(prismaMock.committeeList.findUnique).not.toHaveBeenCalled();
        });
      },
    );

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
      await expectErrorResponse(response, 404, "Committee not found");
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
      await expectErrorResponse(response, 500, "Internal server error");
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
      await expectSuccessResponse(response, mockCommittee);
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
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1, // first value wins
        }),
      );
    });

    it("should handle electionDistrict with leading/trailing whitespace", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      // Test with whitespace around the electionDistrict
      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=%201%20&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1, // Should be trimmed and parsed correctly
        }),
      );
    });

    it("should return 400 for electionDistrict with non-digit characters", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1a&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("should return 400 for empty electionDistrict after trimming", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=%20%20&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("should handle legDistrict with leading/trailing whitespace", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      // Test with whitespace around the legDistrict
      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=%201%20",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1, // Should be trimmed and parsed correctly
          electionDistrict: 1,
        }),
      );
    });

    it("should return 404 for empty legDistrict after trimming (committee not found)", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=%20%20",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 404, "Committee not found");
    });

    // Edge case tests for legDistrict parameter handling
    it("should return 400 for legDistrict parameter with invalid numeric value", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=invalid",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
      expect(prismaMock.committeeList.findUnique).not.toHaveBeenCalled();
    });

    it("should handle legDistrict parameter with negative value", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=-5",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: -5, // Should accept negative values
          electionDistrict: 1,
        }),
      );
    });

    it("should return 400 for legDistrict parameter with decimal value", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1.5",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
      expect(prismaMock.committeeList.findUnique).not.toHaveBeenCalled();
    });

    // URL encoding edge cases
    it("should handle URL encoded special characters in cityTown", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City%20%26%20Town&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City & Town", // Should decode URL encoding
          legDistrict: 1,
          electionDistrict: 1,
        }),
      );
    });

    it("should handle URL encoded plus signs in cityTown", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%2BCity&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test+City", // Should decode plus signs
          legDistrict: 1,
          electionDistrict: 1,
        }),
      );
    });

    // Multiple query parameters with same name edge cases
    it("should handle multiple cityTown parameters (first value wins)", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=First%20City&cityTown=Second%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "First City", // First value should win
          legDistrict: 1,
          electionDistrict: 1,
        }),
      );
    });

    it("should handle multiple legDistrict parameters (first value wins)", async () => {
      // Arrange
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1&legDistrict=5",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, mockCommittee);
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1, // First value should win
          electionDistrict: 1,
        }),
      );
    });

    it("should return 400 for mixed valid and invalid legDistrict parameters", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1&legDistrict=invalid",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
      expect(prismaMock.committeeList.findUnique).not.toHaveBeenCalled();
    });

    it("should return 404 for mixed valid and invalid electionDistrict parameters (committee not found)", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&electionDistrict=invalid&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 404, "Committee not found");
    });
  });
});
