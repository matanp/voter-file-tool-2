import { POST } from "~/app/api/committee/add/route";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import {
  createMockSession,
  createMockCommitteeData,
  createMockCommittee,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeUpsertArgs,
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
      await expectSuccessResponse(response, mockCommittee, 201);
      expect(prismaMock.committeeList.upsert).toHaveBeenCalledWith(
        createCommitteeUpsertArgs({
          cityTown: mockCommitteeData.cityTown,
          legDistrict: Number(mockCommitteeData.legDistrict),
          electionDistrict: Number(mockCommitteeData.electionDistrict),
          memberId: mockCommitteeData.memberId,
        }),
      );
    });

    // Authentication tests using shared test suite
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/add",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest(createMockCommitteeData()),
      };

      const setupMocks = () => {
        prismaMock.committeeList.upsert.mockResolvedValue(
          createMockCommittee(),
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
        201,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    // Parameterized validation tests
    describe.each([
      ...validationTestCases.missingFields,
      ...validationTestCases.invalidElectionDistrict,
    ])(
      "should return 400 for $field validation",
      ({ field, value, expectedError }) => {
        it(`should return 400 for ${field} = "${value}"`, async () => {
          // Arrange
          const mockCommitteeData = createMockCommitteeData(
            { [field]: value },
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
          // Assert no DB upsert on 400s (missing/invalid fields)
          expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
        });
      },
    );

    describe.each(validationTestCases.invalidNumeric)(
      "should return 400 for invalid numeric $field",
      ({ field, value, expectedError }) => {
        it(`should return 400 for ${field} = "${value}"`, async () => {
          // Arrange
          const mockCommitteeData = createMockCommitteeData(
            {
              [field]: value,
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
          await expectErrorResponse(response, 422, expectedError);
          // Assert no DB upsert on 400s (missing/invalid fields)
          expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
        });
      },
    );

    it("should return 500 for database error", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      // Use the mocked Prisma error class from jest.setup.ts
      const mockError = new Prisma.PrismaClientKnownRequestError(
        "Database error",
        { code: "P2000", clientVersion: "5.0.0" },
      );
      prismaMock.committeeList.upsert.mockRejectedValue(mockError);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for generic error", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      // Generic error (non-Prisma)
      const mockError = new Error("Generic error");
      prismaMock.committeeList.upsert.mockRejectedValue(mockError);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 404 when member to connect is not found", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      // P2025: Record not found (member to connect not found)
      const mockError = new Prisma.PrismaClientKnownRequestError(
        "Record to connect not found",
        { code: "P2025", clientVersion: "5.0.0" },
      );
      prismaMock.committeeList.upsert.mockRejectedValue(mockError);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(response, 404, "Member not found");
    });

    it("should return 409 when member already exists in committee", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      // P2002: Unique constraint violation (duplicate relation)
      const mockError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "5.0.0" },
      );
      prismaMock.committeeList.upsert.mockRejectedValue(mockError);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(
        response,
        409,
        "Duplicate relation - member already exists in committee",
      );
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
      await expectSuccessResponse(response, mockCommittee, 201);
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
