import { POST } from "~/app/api/committee/requestAdd/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeFindUniqueWhereArgs,
  createMockMembership,
  expectMembershipCreate,
  expectMembershipUpdate,
  getMembershipMock,
  setupEligibilityPass,
  validationTestCases,
  createAuthTestSuite,
  DEFAULT_ACTIVE_TERM_ID,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

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

    /** Set up mocks for the full happy-path (SUBMITTED membership created). */
    const setupHappyPath = (committeeId = 1) => {
      setupEligibilityPass(prismaMock);
      // Route looks up by composite key; validateEligibility by id. Support both.
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee({ id: committeeId })) as never;
        },
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership(),
      );
    };

    it("should successfully create a SUBMITTED membership for an add request", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueWhereArgs({
          cityTown: mockRequestData.cityTown,
          legDistrict: Number(mockRequestData.legDistrict),
          electionDistrict: Number(mockRequestData.electionDistrict),
        }),
      );
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: "TEST123456",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "SUBMITTED",
        }),
      );
    });

    it("should store removeMemberId in submissionMetadata when provided with addMemberId", async () => {
      const mockRequestData = createMockRequestData({
        addMemberId: "NEW_MEMBER",
        removeMemberId: "OLD_MEMBER",
        requestNotes: "Replacement request",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: "NEW_MEMBER",
          submissionMetadata: {
            removeMemberId: "OLD_MEMBER",
            requestNotes: "Replacement request",
          },
        }),
      );
    });

    it("should handle undefined legDistrict (at-large) by using sentinel value", async () => {
      const mockRequestData = createMockRequestData({ legDistrict: undefined });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(prismaMock.committeeList.findUnique).toHaveBeenCalledWith(
        createCommitteeFindUniqueWhereArgs({
          cityTown: mockRequestData.cityTown,
          legDistrict: LEG_DISTRICT_SENTINEL, // undefined → sentinel
          electionDistrict: Number(mockRequestData.electionDistrict),
        }),
      );
    });

    it("should trim whitespace from addMemberId before creating membership", async () => {
      const mockRequestData = createMockRequestData({
        addMemberId: "  TEST123456  ",
        removeMemberId: "  ", // whitespace-only should be treated as absent
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({ voterRecordId: "TEST123456" }),
      );
    });

    it("should handle missing requestNotes (omits from submissionMetadata)", async () => {
      const mockRequestData = createMockRequestData({ requestNotes: undefined });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          submissionMetadata: {}, // no notes, no removeMemberId
        }),
      );
    });

    it("should return 422 for remove-only requests (no addMemberId)", async () => {
      const mockRequestData = createMockRequestData({
        addMemberId: null,
        removeMemberId: "TEST123456",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422);
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 200 when request already SUBMITTED (idempotent)", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee()) as never;
        },
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request already submitted" },
        200,
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 400 when member is already ACTIVE in this committee", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee()) as never;
        },
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        400,
        "Member is already active in this committee",
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should resubmit an existing REJECTED membership by updating to SUBMITTED", async () => {
      const mockRequestData = createMockRequestData({
        requestNotes: undefined,
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee()) as never;
        },
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-rejected-1",
          status: "REJECTED",
          submissionMetadata: { requestNotes: "Original notes" },
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ id: "membership-rejected-1", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "SUBMITTED",
            submissionMetadata: {},
          },
          { id: "membership-rejected-1" },
        ),
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should clear stale removeMemberId on add-only resubmission", async () => {
      const mockRequestData = createMockRequestData({
        removeMemberId: null,
        requestNotes: "Fresh add-only request",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee()) as never;
        },
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-rejected-2",
          status: "REJECTED",
          submissionMetadata: {
            removeMemberId: "STALE_MEMBER",
            requestNotes: "Old replacement request",
          },
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ id: "membership-rejected-2", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "SUBMITTED",
            submissionMetadata: {
              requestNotes: "Fresh add-only request",
            },
          },
          { id: "membership-rejected-2" },
        ),
      );
    });

    it("should resubmit an existing REMOVED membership and update submissionMetadata", async () => {
      const mockRequestData = createMockRequestData({
        removeMemberId: "OLD_MEMBER",
        requestNotes: "Replacement after removal",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee()) as never;
        },
      );
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-removed-1",
          status: "REMOVED",
          submissionMetadata: { requestNotes: "Old note" },
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ id: "membership-removed-1", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "SUBMITTED",
            submissionMetadata: {
              requestNotes: "Replacement after removal",
              removeMemberId: "OLD_MEMBER",
            },
          },
          { id: "membership-removed-1" },
        ),
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 422 INELIGIBLE when add member is ACTIVE in another committee", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeList.findUnique.mockImplementation(
        (args: { where: { id?: number } }) => {
          if (args.where.id !== undefined) {
            return Promise.resolve({
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            }) as never;
          }
          return Promise.resolve(createMockCommittee({ id: 1 })) as never;
        },
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(
        createMockMembership({ committeeListId: 999, status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("ALREADY_IN_ANOTHER_COMMITTEE");
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 404 when committee is not found", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockResolvedValue(null);

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        404,
        "Committee not found. Ensure you are submitting to the active term.",
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 500 for database error during committee lookup", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      prismaMock.committeeList.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for database error during membership creation", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();
      getMembershipMock(prismaMock).create.mockRejectedValue(
        new Error("FK constraint violation"),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    // Authentication tests
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/requestAdd",
        requiredPrivilege: PrivilegeLevel.RequestAccess,
        mockRequest: () => createMockRequest(createMockRequestData()),
      };

      const setupMocks = () => setupHappyPath();

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

    // Validation tests
    test.each([
      // Missing required fields
      { field: "cityTown", value: "", type: "missing" },
      { field: "electionDistrict", value: null, type: "missing" },

      // Invalid numeric values
      { field: "electionDistrict", value: 1.5, type: "invalid_numeric" },
      { field: "legDistrict", value: "invalid", type: "invalid_numeric" },
      {
        field: "legDistrict",
        value: LEG_DISTRICT_SENTINEL,
        type: "invalid_numeric",
      },
    ])(
      "should return 422 for $type $field",
      async ({ field, value, type: _type }) => {
        const mockRequestData = createMockRequestData({ [field]: value });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
        );
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockRequestData));

        await expectErrorResponse(response, 422, "Invalid request data");
      },
    );

    test.each(validationTestCases.invalidRequestNotes)(
      "should return 422 for invalid requestNotes - $field",
      async ({ field, value, expectedError }) => {
        const mockRequestData = createMockRequestData({ [field]: value });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
        );
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockRequestData));

        await expectErrorResponse(response, 422, expectedError);
      },
    );

    it("should return 422 when both addMemberId and removeMemberId are null", async () => {
      const mockRequestData = createMockRequestData({
        addMemberId: null,
        removeMemberId: null,
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422, "Invalid request data");
    });
  });
});
