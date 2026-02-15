import { POST } from "~/app/api/committee/add/route";
import { PrivilegeLevel, Prisma, type CommitteeList } from "@prisma/client";
import {
  createMockSession,
  createMockCommitteeData,
  createMockCommittee,
  createMockVoterRecord,
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          committee: mockCommittee,
          message: "Committee created and member added",
        },
        201,
      );
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
        prismaMock.committeeList.findUnique.mockResolvedValue(null);
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
    test.each([
      ...validationTestCases.missingFields,
      ...validationTestCases.invalidElectionDistrict,
    ])(
      "should return 422 for $field validation",
      async ({ field, value, expectedError }) => {
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
        // Assert no DB upsert on 422s (missing/invalid fields)
        expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
      },
    );

    test.each(validationTestCases.invalidNumeric)(
      "should return 422 for invalid numeric $field",
      async ({ field, value, expectedError }) => {
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
        // Assert no DB upsert on 422s (missing/invalid fields)
        expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
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

    it("should return 400 when member is already in another committee", async () => {
      // Arrange: committee exists but member is not in it; voter has committeeId set to different committee
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(
        createMockCommittee({ id: 1, committeeMemberList: [] }) as CommitteeList,
      );
      prismaMock.voterRecord.findUnique.mockResolvedValue(
        createMockVoterRecord({ committeeId: 999 }),
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(
        response,
        400,
        "Member is already in another committee",
      );
      expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
    });

    it("should return 400 when member is in another committee and target committee does not exist", async () => {
      // Arrange: creating new committee, but voter is already in some committee
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);
      prismaMock.voterRecord.findUnique.mockResolvedValue(
        createMockVoterRecord({ committeeId: 1 }),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(mockCommittee);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectErrorResponse(
        response,
        400,
        "Member is already in another committee",
      );
      expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
    });

    it("should succeed when member has no committee (committeeId null)", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);
      prismaMock.voterRecord.findUnique.mockResolvedValue(
        createMockVoterRecord({ committeeId: null }),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(mockCommittee);

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          committee: mockCommittee,
          message: "Committee created and member added",
        },
        201,
      );
      expect(prismaMock.committeeList.upsert).toHaveBeenCalled();
    });

    it("should return 200 with idempotent success when member already exists in committee", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });
      const mockCommittee = createMockCommittee();

      mockAuthSession(mockSession);
      mockHasPermission(true);

      // Mock existing committee with member already connected
      const existingCommitteeWithMember = {
        ...mockCommittee,
        committeeMemberList: [createMockVoterRecord()],
      };
      prismaMock.committeeList.findUnique.mockResolvedValue(
        existingCommitteeWithMember,
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(response, {
        success: true,
        message: "Member already connected to committee",
        committee: existingCommitteeWithMember,
        idempotent: true,
      });
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
      await expectSuccessResponse(
        response,
        {
          success: true,
          committee: mockCommittee,
          message: "Committee created and member added",
        },
        201,
      );
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

    it("should return idempotent success when member is already in committee", async () => {
      // Arrange
      const mockCommitteeData = createMockCommitteeData();
      const mockCommittee = createMockCommittee();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);

      // Mock existing committee with member already connected
      const existingCommitteeWithMember = {
        ...mockCommittee,
        committeeMemberList: [{ VRCNUM: mockCommitteeData.memberId }],
      };
      prismaMock.committeeList.findUnique.mockResolvedValue(
        existingCommitteeWithMember,
      );

      const request = createMockRequest(mockCommitteeData);

      // Act
      const response = await POST(request);

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Member already connected to committee",
          committee: existingCommitteeWithMember,
          idempotent: true,
        },
        200,
      );

      // Verify that findUnique was called but upsert was not
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalled();
      expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
    });

    // Integration aspects - Database transaction behavior
    describe("Database transaction behavior", () => {
      it("should handle concurrent committee creation attempts", async () => {
        // Arrange
        const mockCommitteeData = createMockCommitteeData();
        const mockCommittee = createMockCommittee();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Simulate race condition: first call finds no committee, second call creates it
        prismaMock.committeeList.findUnique
          .mockResolvedValueOnce(null) // First call: no committee exists
          .mockResolvedValueOnce(mockCommittee); // Second call: committee now exists

        prismaMock.committeeList.upsert.mockResolvedValue(mockCommittee);

        const request = createMockRequest(mockCommitteeData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            committee: mockCommittee,
            message: "Committee created and member added",
          },
          201,
        );

        // Verify both findUnique and upsert were called
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalledTimes(1);
        expect(prismaMock.committeeList.upsert).toHaveBeenCalledTimes(1);
      });

      it("should maintain data consistency when upsert fails after successful findUnique", async () => {
        // Arrange
        const mockCommitteeData = createMockCommitteeData();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Mock successful findUnique but failed upsert
        prismaMock.committeeList.findUnique.mockResolvedValue(null);
        prismaMock.committeeList.upsert.mockRejectedValue(
          new Error("Database constraint violation"),
        );

        const request = createMockRequest(mockCommitteeData);

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");

        // Verify that both operations were attempted
        expect(prismaMock.committeeList.findUnique).toHaveBeenCalled();
        expect(prismaMock.committeeList.upsert).toHaveBeenCalled();
      });
    });

    // Integration aspects - Data integrity validation
    describe("Data integrity validation", () => {
      it("should validate committee-member relationship consistency", async () => {
        // Arrange
        const mockCommitteeData = createMockCommitteeData();
        const mockCommittee = createMockCommittee();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        // Mock committee creation with member connection
        const committeeWithMember = {
          ...mockCommittee,
          committeeMemberList: [
            createMockVoterRecord({ VRCNUM: mockCommitteeData.memberId }),
          ],
        };
        prismaMock.committeeList.upsert.mockResolvedValue(committeeWithMember);

        const request = createMockRequest(mockCommitteeData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            committee: committeeWithMember,
            message: "Committee created and member added",
          },
          201,
        );

        // Verify the upsert was called with correct member connection
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
});
