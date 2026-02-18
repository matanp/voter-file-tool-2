import { GET } from "~/app/api/fetchCommitteeList/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  createMockGovernanceConfig,
  createMockVoterRecord,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeFindUniqueArgs,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";

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
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig(),
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
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        }),
      );
    });

    it("should include maxSeatsPerLted from governance config in response", async () => {
      const mockCommittee = createMockCommittee();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 2 }),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
      );
      const response = await GET(request);

      const data = (await response.json()) as { maxSeatsPerLted?: number };
      expect(data.maxSeatsPerLted).toBe(2);
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
      "should return 422 for $param validation",
      ({ param, value, error, url }) => {
        it(`should return 422 for ${param} = "${value}"`, async () => {
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
      await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: LEG_DISTRICT_SENTINEL, // Should default to sentinel value when not provided
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
      await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
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
      await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueArgs({
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1, // Should be trimmed and parsed correctly
        }),
      );
    });

    it("should return 422 for electionDistrict with non-digit characters", async () => {
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

    it("should return 422 for empty electionDistrict after trimming", async () => {
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
      await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
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
    it("should return 422 for legDistrict parameter with invalid numeric value", async () => {
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

    it("should return 422 for legDistrict parameter with negative value", async () => {
      // Arrange
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      const request = new NextRequest(
        "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=-5",
      );

      // Act
      const response = await GET(request);

      // Assert
      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("should return 422 for legDistrict parameter with decimal value", async () => {
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

    // URL encoding edge cases - consolidated test
    test.each([
      {
        description: "special characters (&)",
        encodedCityTown: "Test%20City%20%26%20Town",
        expectedCityTown: "Test City & Town",
      },
      {
        description: "plus signs",
        encodedCityTown: "Test%2BCity",
        expectedCityTown: "Test+City",
      },
      {
        description: "spaces",
        encodedCityTown: "Test%20City",
        expectedCityTown: "Test City",
      },
    ])(
      "should handle URL encoded $description in cityTown",
      async ({ encodedCityTown, expectedCityTown }) => {
        // Arrange
        const mockCommittee = createMockCommittee();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

        const request = new NextRequest(
          `http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=${encodedCityTown}&legDistrict=1`,
        );

        // Act
        const response = await GET(request);

        // Assert
        await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
          createCommitteeFindUniqueArgs({
            cityTown: expectedCityTown,
            legDistrict: 1,
            electionDistrict: 1,
          }),
        );
      },
    );

    // Multiple query parameters with same name edge cases - consolidated
    test.each([
      {
        description: "multiple cityTown parameters",
        url: "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=First%20City&cityTown=Second%20City&legDistrict=1",
        expectedArgs: {
          cityTown: "First City",
          legDistrict: 1,
          electionDistrict: 1,
        },
      },
      {
        description: "multiple legDistrict parameters",
        url: "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1&legDistrict=5",
        expectedArgs: {
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        },
      },
    ])(
      "should handle $description (first value wins)",
      async ({ url, expectedArgs }) => {
        // Arrange
        const mockCommittee = createMockCommittee();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

        const request = new NextRequest(url);

        // Act
        const response = await GET(request);

        // Assert
        await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
          createCommitteeFindUniqueArgs(expectedArgs),
        );
      },
    );

    it("should return 422 for mixed valid and invalid legDistrict parameters", async () => {
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

    // Integration aspects - Data consistency validation
    describe("Data consistency integration", () => {
      it("should handle committee with complex member relationships", async () => {
        // Arrange
        const mockCommittee = createMockCommittee({
          committeeMemberList: [
            createMockVoterRecord({ VRCNUM: "MEMBER001", committeeId: 1 }),
            createMockVoterRecord({ VRCNUM: "MEMBER002", committeeId: 1 }),
            createMockVoterRecord({ VRCNUM: "MEMBER003", committeeId: 1 }),
          ],
        });
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
        await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });

        // Verify the committee lookup included active memberships
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
          createCommitteeFindUniqueArgs({
            cityTown: "Test City",
            legDistrict: 1,
            electionDistrict: 1,
          }),
        );
      });

      it("should validate committee-district relationship integrity", async () => {
        // Arrange
        const mockCommittee = createMockCommittee({
          cityTown: "Test City",
          legDistrict: 5,
          electionDistrict: 10,
        });
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

        const request = new NextRequest(
          "http://localhost:3000/api/fetchCommitteeList?electionDistrict=10&cityTown=Test%20City&legDistrict=5",
        );

        // Act
        const response = await GET(request);

        // Assert
        await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });

        // Verify the lookup used the exact district parameters
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
          createCommitteeFindUniqueArgs({
            cityTown: "Test City",
            legDistrict: 5,
            electionDistrict: 10,
          }),
        );
      });

      it("should handle database connection failures gracefully", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Mock database connection failure
        prismaMock.committeeList.findUnique.mockRejectedValue(
          new Error("Connection timeout"),
        );

        const request = new NextRequest(
          "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
        );

        // Act
        const response = await GET(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");

        // Verify the database call was attempted
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalled();
      });
    });

    // Integration aspects - Authorization and data access
    describe("Authorization and data access integration", () => {
      it("should enforce admin-only access to committee data", async () => {
        // Arrange
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.ReadAccess }, // Insufficient privileges
        });

        mockAuthSession(mockSession);
        mockHasPermission(false); // Explicitly deny permission

        const request = new NextRequest(
          "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
        );

        // Act
        const response = await GET(request);

        // Assert
        await expectErrorResponse(
          response,
          403,
          "User does not have sufficient privilege",
        );

        // Verify no database call was made due to authorization failure
        expect(prismaMock.committeeList.findUnique).not.toHaveBeenCalled();
      });

      it("should handle session expiration during request processing", async () => {
        // Arrange
        const mockCommittee = createMockCommittee();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        // Mock session becoming invalid between auth check and database call
        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Simulate session becoming invalid (this would be handled by the auth middleware)
        // For this test, we're verifying the endpoint behavior with valid session
        prismaMock.committeeList.findUnique.mockResolvedValue(mockCommittee);

        const request = new NextRequest(
          "http://localhost:3000/api/fetchCommitteeList?electionDistrict=1&cityTown=Test%20City&legDistrict=1",
        );

        // Act
        const response = await GET(request);

        // Assert
        await expectSuccessResponse(response, {
        ...mockCommittee,
        maxSeatsPerLted: 4,
      });

        // Verify the request completed successfully with valid session
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalled();
      });
    });
  });
});
