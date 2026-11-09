import { POST } from "~/app/api/committee/requestAdd/route";
import {
  PrivilegeLevel,
  type CommitteeList,
  type Prisma,
} from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  createMockGovernanceConfig,
  createMockRequest,
  createMockVoterRecord,
  expectSuccessResponse,
  expectErrorResponse,
  createCommitteeFindUniqueWhereArgs,
  createMockMembership,
  expectMembershipCreate,
  expectMembershipUpdate,
  getAuditLogMock,
  parseJsonResponse,
  setupEligibilityPass,
  setupMembershipAuditSubjectMocks,
  stubMembershipRows,
  resolvesTo,
  firstCallArg,
  type MockMembership,
  expectAuditLogCreate,
  jsonContaining,
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

/** What `validateEligibility` reads when it looks the committee up by id. */
type EligibilityCommitteeRow = Pick<
  CommitteeList,
  "cityTown" | "legDistrict" | "electionDistrict"
>;
type RequestedCommitteeRow = ReturnType<typeof createMockCommittee>;

/**
 * The route looks the committee up by composite key (with its term);
 * `validateEligibility` looks it up by id. Answers both.
 */
function stubCommitteeLookups(committeeId = 1): void {
  prismaMock.committeeList.findUnique.mockImplementation(
    (args: Prisma.CommitteeListFindUniqueArgs) =>
      args.where.id !== undefined
        ? resolvesTo<EligibilityCommitteeRow>({
            cityTown: "Test City",
            legDistrict: 1,
            electionDistrict: 1,
          })
        : resolvesTo<RequestedCommitteeRow>(
            createMockCommittee({ id: committeeId }),
          ),
  );
}

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
      stubCommitteeLookups(committeeId);
      prismaMock.committeeMembership.findUnique.mockResolvedValue(null);
      prismaMock.committeeMembership.create.mockResolvedValue(
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
      expect(prismaMock.committeeMembership.create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: "TEST123456",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "SUBMITTED",
        }),
      );
    });

    it("should store email and phone in submissionMetadata when provided (SRS 2.1a)", async () => {
      const mockRequestData = createMockRequestData({
        addMemberId: "NEW_MEMBER",
        email: "leader@example.com",
        phone: "555-9999",
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
      expect(prismaMock.committeeMembership.create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: "NEW_MEMBER",
          submissionMetadata: {
            requestNotes: "Test request notes",
            email: "leader@example.com",
            phone: "555-9999",
          },
        }),
      );
    });

    it("should return warnings and persist eligibilityWarnings in submissionMetadata when eligibility has warnings (SRS §2.2)", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();
      prismaMock.voterRecord.findFirst.mockResolvedValue(
        createMockVoterRecord({
          latestRecordEntryYear: 2024,
          latestRecordEntryNumber: 2,
        }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      type RequestSuccessWithWarnings = {
        success: boolean;
        message: string;
        warnings?: Array<{ code: string; message: string }>;
      };
      const data = await parseJsonResponse<RequestSuccessWithWarnings>(response);
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.warnings)).toBe(true);
      expect(data.warnings?.length).toBeGreaterThan(0);
      const firstWarning = data.warnings?.[0];
      expect(firstWarning?.code).toBe("POSSIBLY_INACTIVE");
      expect(firstWarning?.message).toContain("most recent voter file import");

      expect(prismaMock.committeeMembership.create).toHaveBeenCalledTimes(1);
      type CreateArg = { data: { submissionMetadata?: { eligibilityWarnings?: Array<{ code: string; message: string }> } } };
      const createCallArg = firstCallArg<CreateArg>(
        prismaMock.committeeMembership.create,
      ).data;
      expect(createCallArg?.submissionMetadata?.eligibilityWarnings).toBeDefined();
      const storedWarnings =
        createCallArg?.submissionMetadata?.eligibilityWarnings ?? [];
      expect(storedWarnings.length).toBeGreaterThan(0);
      expect(storedWarnings[0]?.code).toBe("POSSIBLY_INACTIVE");
      expect(storedWarnings[0]?.message).toContain("most recent voter file import");
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
      expect(prismaMock.committeeMembership.create).toHaveBeenCalledWith(
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
      expect(prismaMock.committeeMembership.create).toHaveBeenCalledWith(
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
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("should return 200 when request already SUBMITTED (idempotent)", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      stubCommitteeLookups();
      stubMembershipRows(prismaMock, [createMockMembership({ status: "SUBMITTED" })]);

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request already submitted" },
        200,
      );
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("should return 400 when member is already ACTIVE in this committee", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      stubCommitteeLookups();
      prismaMock.committeeMembership.findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        400,
        "Member is already active in this committee",
      );
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
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
      stubCommitteeLookups();
      prismaMock.committeeMembership.findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-rejected-1",
          status: "REJECTED",
          submissionMetadata: { requestNotes: "Original notes" },
        }),
      );
      prismaMock.committeeMembership.update.mockResolvedValue(
        createMockMembership({ id: "membership-rejected-1", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "SUBMITTED",
            submissionMetadata: {},
          },
          { id: "membership-rejected-1" },
        ),
      );
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
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
      stubCommitteeLookups();
      prismaMock.committeeMembership.findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-rejected-2",
          status: "REJECTED",
          submissionMetadata: {
            removeMemberId: "STALE_MEMBER",
            requestNotes: "Old replacement request",
          },
        }),
      );
      prismaMock.committeeMembership.update.mockResolvedValue(
        createMockMembership({ id: "membership-rejected-2", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
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
        requestNotes: "Back after removal",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      stubCommitteeLookups();
      prismaMock.committeeMembership.findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-removed-1",
          status: "REMOVED",
          submissionMetadata: { requestNotes: "Old note" },
        }),
      );
      prismaMock.committeeMembership.update.mockResolvedValue(
        createMockMembership({ id: "membership-removed-1", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Request created" },
        201,
      );
      expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "SUBMITTED",
            submissionMetadata: {
              requestNotes: "Back after removal",
            },
          },
          { id: "membership-removed-1" },
        ),
      );
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("should return 422 INELIGIBLE when add member is ACTIVE in another committee", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      stubCommitteeLookups();
      prismaMock.committeeMembership.findFirst.mockResolvedValue(
        createMockMembership({ committeeListId: 999, status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("ALREADY_IN_ANOTHER_COMMITTEE");
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("should not create CommitteeMembership row when hard-stop eligibility fails", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);

      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({
          maxSeatsPerLted: 1,
          requireAssemblyDistrictMatch: false,
        }),
      );
      prismaMock.voterRecord.findUnique.mockResolvedValue(
        createMockVoterRecord({ party: "DEM" }),
      );
      stubCommitteeLookups();
      prismaMock.committeeMembership.count.mockResolvedValue(1);
      prismaMock.committeeMembership.findFirst.mockResolvedValue(null);

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("CAPACITY");
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
      expect(prismaMock.committeeMembership.update).not.toHaveBeenCalled();
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
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
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
      prismaMock.committeeMembership.create.mockRejectedValue(
        new Error("FK constraint violation"),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 when audit log write fails during membership creation", async () => {
      const mockRequestData = createMockRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupHappyPath();
      getAuditLogMock(prismaMock).create.mockRejectedValue(
        new Error("Audit log write failed"),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 500, "Internal server error");
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.committeeMembership.create).toHaveBeenCalled();
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
  describe("replacements (ticket 09)", () => {
    const REPORTED_AT = new Date("2026-10-30T15:04:05.678Z");
    const CANDIDATE_ID = "membership-candidate-1";
    const OUTGOING_ID = "membership-outgoing-1";

    const replacementBody = (overrides: Record<string, unknown> = {}) => ({
      cityTown: "Test City",
      legDistrict: "1",
      electionDistrict: 1,
      addMemberId: "NEW_MEMBER",
      removeMemberId: "OLD_MEMBER",
      requestNotes: "Replacement request",
      exitReport: {
        kind: "RESIGNATION",
        resignationDateReceived: "2026-10-28",
        resignationMethod: "EMAIL",
        removalNotes: "Moving to Ohio",
      },
      ...overrides,
    });

    const outgoingRow = (overrides: Partial<MockMembership> = {}) => ({
      ...createMockMembership({
        id: OUTGOING_ID,
        voterRecordId: "OLD_MEMBER",
        status: "ACTIVE",
        seatNumber: 2,
        ...overrides,
      }),
      voterRecord: { VRCNUM: "OLD_MEMBER", firstName: "Olive", middleInitial: null, lastName: "Out" },
    });

    const setup = (rows: ReturnType<typeof outgoingRow>[]) => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      setupMembershipAuditSubjectMocks(prismaMock);
      stubCommitteeLookups();
      stubMembershipRows(prismaMock, rows);
      prismaMock.committeeMembership.create.mockResolvedValue(
        createMockMembership({ id: CANDIDATE_ID, voterRecordId: "NEW_MEMBER" }),
      );
      prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
    };

    const outgoingUpdateMany = (): Prisma.CommitteeMembershipUpdateManyArgs[] =>
      prismaMock.committeeMembership.updateMany.mock.calls
        .map(([args]) => args)
        .filter((args) => args.where?.id === OUTGOING_ID);

    it("files the outgoing member's Exit Report paired with the new Submission", async () => {
      setup([outgoingRow()]);

      const response = await POST(createMockRequest(replacementBody()));

      expect(response.status).toBe(201);
      expect(prismaMock.committeeMembership.create).toHaveBeenCalledWith(
        expectMembershipCreate({
          voterRecordId: "NEW_MEMBER",
          status: "SUBMITTED",
          // The outgoing member is no longer on the Submission.
          submissionMetadata: { requestNotes: "Replacement request" },
        }),
      );
      expect(outgoingUpdateMany()).toEqual([
        {
          where: { id: OUTGOING_ID, status: "ACTIVE", exitReportedAt: null },
          data: {
            exitReportedAt: expect.any(Date),
            exitReportedById: "test-user-id",
            exitReportedKind: "RESIGNATION",
            resignationDateReceived: new Date("2026-10-28"),
            resignationMethod: "EMAIL",
            removalReason: null,
            removalNotes: "Moving to Ohio",
            replacementMembershipId: CANDIDATE_ID,
          },
        },
      ]);
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_SUBMITTED",
          entityId: CANDIDATE_ID,
          metadata: jsonContaining({ removeMemberId: "OLD_MEMBER" }),
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_EXIT_REPORTED",
          entityId: OUTGOING_ID,
          afterValue: jsonContaining({
            exitReportedKind: "RESIGNATION",
            resignationMethod: "EMAIL",
            resignationDateReceived: "2026-10-28",
          }),
          metadata: jsonContaining({
            reason: "replacement",
            replacementMembershipId: CANDIDATE_ID,
          }),
        }),
      );
    });

    it("refuses a replacement without the outgoing member's exit", async () => {
      setup([outgoingRow()]);

      const response = await POST(
        createMockRequest(replacementBody({ exitReport: undefined })),
      );

      expect(response.status).toBe(422);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("refuses an exit report on a plain add", async () => {
      setup([outgoingRow()]);

      const response = await POST(
        createMockRequest(replacementBody({ removeMemberId: undefined })),
      );

      expect(response.status).toBe(422);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("refuses a removal without a reason, as a standalone report would", async () => {
      setup([outgoingRow()]);

      const response = await POST(
        createMockRequest(replacementBody({ exitReport: { kind: "REMOVAL" } })),
      );

      expect(response.status).toBe(422);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("refuses a member who isn't ACTIVE in the committee", async () => {
      setup([outgoingRow({ status: "REMOVED" })]);

      const response = await POST(createMockRequest(replacementBody()));

      await expectErrorResponse(
        response,
        422,
        "The member being replaced is not an active member of this committee",
      );
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("refuses a candidate replacing themselves", async () => {
      setup([outgoingRow()]);

      const response = await POST(
        createMockRequest(replacementBody({ addMemberId: "OLD_MEMBER" })),
      );

      expect(response.status).toBe(422);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("refuses to file a second report when one is already pending (409)", async () => {
      setup([
        outgoingRow({
          exitReportedAt: REPORTED_AT,
          exitReportedKind: "REMOVAL",
          removalReason: "DECEASED",
        }),
      ]);

      const response = await POST(createMockRequest(replacementBody()));

      expect(response.status).toBe(409);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
      expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
    });

    it("pairs with the pending report the Leader saw, without duplicating it", async () => {
      setup([
        outgoingRow({
          exitReportedAt: REPORTED_AT,
          exitReportedKind: "REMOVAL",
          removalReason: "DECEASED",
        }),
      ]);

      const response = await POST(
        createMockRequest(
          replacementBody({
            exitReport: undefined,
            existingExitReportedAt: REPORTED_AT.toISOString(),
          }),
        ),
      );

      expect(response.status).toBe(201);
      expect(outgoingUpdateMany()).toEqual([
        {
          where: {
            id: OUTGOING_ID,
            status: "ACTIVE",
            exitReportedAt: REPORTED_AT,
            replacementMembershipId: null,
          },
          data: { replacementMembershipId: CANDIDATE_ID },
        },
      ]);
      expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_EXIT_REPORTED" }),
      );
    });

    it("rewrites every field of the pending report when the Leader updates it, and audits it", async () => {
      setup([
        outgoingRow({
          exitReportedAt: REPORTED_AT,
          exitReportedKind: "REMOVAL",
          removalReason: "DECEASED",
          removalNotes: "Old note",
        }),
      ]);

      const response = await POST(
        createMockRequest(
          replacementBody({ existingExitReportedAt: REPORTED_AT.toISOString() }),
        ),
      );

      expect(response.status).toBe(201);
      const [write] = outgoingUpdateMany();
      expect(write?.where).toEqual({
        id: OUTGOING_ID,
        status: "ACTIVE",
        exitReportedAt: REPORTED_AT,
        replacementMembershipId: null,
      });
      expect(write?.data).toEqual({
        exitReportedAt: expect.any(Date),
        exitReportedById: "test-user-id",
        exitReportedKind: "RESIGNATION",
        resignationDateReceived: new Date("2026-10-28"),
        resignationMethod: "EMAIL",
        removalReason: null,
        removalNotes: "Moving to Ohio",
        replacementMembershipId: CANDIDATE_ID,
      });
      // A new report instant, so an Admin looking at the old one can't confirm it.
      expect(write?.data.exitReportedAt).not.toEqual(REPORTED_AT);
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_EXIT_REPORTED",
          entityId: OUTGOING_ID,
          beforeValue: jsonContaining({
            exitReportedAt: REPORTED_AT.toISOString(),
            exitReportedKind: "REMOVAL",
            removalReason: "DECEASED",
          }),
          metadata: jsonContaining({ updatedReport: true }),
        }),
      );
    });

    it("refuses a pending report that changed since the Leader saw it (409)", async () => {
      setup([
        outgoingRow({
          exitReportedAt: REPORTED_AT,
          exitReportedKind: "REMOVAL",
          removalReason: "DECEASED",
        }),
      ]);

      const response = await POST(
        createMockRequest(
          replacementBody({
            exitReport: undefined,
            existingExitReportedAt: "2026-10-01T00:00:00.000Z",
          }),
        ),
      );

      expect(response.status).toBe(409);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("refuses a member already paired with another pending candidate (409)", async () => {
      setup([
        outgoingRow({
          exitReportedAt: REPORTED_AT,
          exitReportedKind: "REMOVAL",
          removalReason: "DECEASED",
          replacementMembershipId: "someone-else",
        }),
      ]);

      const response = await POST(
        createMockRequest(
          replacementBody({
            exitReport: undefined,
            existingExitReportedAt: REPORTED_AT.toISOString(),
          }),
        ),
      );

      expect(response.status).toBe(409);
      expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
    });

    it("returns 409 when the conditional write on the outgoing member loses a race", async () => {
      setup([outgoingRow()]);
      prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 0 });

      const response = await POST(createMockRequest(replacementBody()));

      await expectErrorResponse(response, 409, "This member changed, refresh.");
    });

    it("unpairs a stale pairing before reusing a candidate's old row", async () => {
      setup([
        outgoingRow(),
        {
          ...createMockMembership({
            id: "membership-rejected-9",
            voterRecordId: "NEW_MEMBER",
            status: "REJECTED",
          }),
          voterRecord: { VRCNUM: "NEW_MEMBER", firstName: "Nia", middleInitial: null, lastName: "New" },
        },
      ]);
      prismaMock.committeeMembership.update.mockResolvedValue(
        createMockMembership({ id: "membership-rejected-9", status: "SUBMITTED" }),
      );

      const response = await POST(createMockRequest(replacementBody()));

      expect(response.status).toBe(201);
      expect(prismaMock.committeeMembership.updateMany).toHaveBeenCalledWith({
        where: { replacementMembershipId: "membership-rejected-9" },
        data: { replacementMembershipId: null },
      });
      expect(outgoingUpdateMany()[0]?.data).toMatchObject({
        replacementMembershipId: "membership-rejected-9",
      });
    });

    describe("an identical retry after the replacement went through", () => {
      /** The state the first attempt left: candidate pending, report paired with it. */
      const setupAfterFirstAttempt = (reportedAt: Date) =>
        setup([
          outgoingRow({
            exitReportedAt: reportedAt,
            exitReportedKind: "RESIGNATION",
            replacementMembershipId: CANDIDATE_ID,
          }),
          {
            ...createMockMembership({
              id: CANDIDATE_ID,
              voterRecordId: "NEW_MEMBER",
              status: "SUBMITTED",
            }),
            voterRecord: { VRCNUM: "NEW_MEMBER", firstName: "Nia", middleInitial: null, lastName: "New" },
          },
        ]);

      const expectIdempotent = async (response: Response) => {
        await expectSuccessResponse(
          response,
          { success: true, message: "Request already submitted" },
          200,
        );
        expect(prismaMock.committeeMembership.create).not.toHaveBeenCalled();
        expect(prismaMock.committeeMembership.update).not.toHaveBeenCalled();
        expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
        expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalled();
      };

      it("returns 200 after the first attempt filed a new report", async () => {
        setupAfterFirstAttempt(new Date("2026-11-02T09:00:00.000Z"));

        await expectIdempotent(await POST(createMockRequest(replacementBody())));
      });

      it("returns 200 after the first attempt rewrote the pending report", async () => {
        // The rewrite gave the report a new instant; the retry still names the old one.
        setupAfterFirstAttempt(new Date("2026-11-02T09:00:00.000Z"));

        await expectIdempotent(
          await POST(
            createMockRequest(
              replacementBody({ existingExitReportedAt: REPORTED_AT.toISOString() }),
            ),
          ),
        );
      });

      it("returns 200 after the first attempt paired with the pending report as is", async () => {
        setupAfterFirstAttempt(REPORTED_AT);

        await expectIdempotent(
          await POST(
            createMockRequest(
              replacementBody({
                exitReport: undefined,
                existingExitReportedAt: REPORTED_AT.toISOString(),
              }),
            ),
          ),
        );
      });
    });

    it("refuses to turn a candidate already pending as a plain add into a replacement (409)", async () => {
      setup([
        outgoingRow(),
        {
          ...createMockMembership({
            id: "membership-pending-7",
            voterRecordId: "NEW_MEMBER",
            status: "SUBMITTED",
          }),
          voterRecord: { VRCNUM: "NEW_MEMBER", firstName: "Nia", middleInitial: null, lastName: "New" },
        },
      ]);

      const response = await POST(createMockRequest(replacementBody()));

      expect(response.status).toBe(409);
      expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
    });
  });
});
