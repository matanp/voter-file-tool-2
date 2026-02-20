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
  createMockGovernanceConfig,
  createMockMembership,
  expectMembershipCreate,
  expectMembershipUpdate,
  expectAuditLogCreate,
  getMembershipMock,
  getAuditLogMock,
  setupEligibilityPass,
  validationTestCases,
  createAuthTestSuite,
  parseJsonResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

/** Typed refs to avoid unsafe-call/assignment (mock imports can be inferred as error in some configs). */
const setupEligibilityPassTyped = setupEligibilityPass as (mock: unknown) => void;
const getMembershipMockTyped = getMembershipMock as (mock: unknown) => ReturnType<typeof getMembershipMock>;

describe("/api/committee/add", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/add", () => {
    /** Set up mocks for the full happy-path (new membership created). */
    const setupHappyPath = () => {
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMockTyped(prismaMock).create.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );
    };

    it("should successfully add a member to a committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(prismaMock.committeeList.upsert).toHaveBeenCalledWith(
        createCommitteeUpsertArgs({
          cityTown: mockCommitteeData.cityTown,
          legDistrict: Number(mockCommitteeData.legDistrict),
          electionDistrict: Number(mockCommitteeData.electionDistrict),
        }),
      );
      expect(getMembershipMockTyped(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
    });

    it("should store PETITIONED when membershipType is provided", async () => {
      const mockCommitteeData = createMockCommitteeData({
        membershipType: "PETITIONED",
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(getMembershipMockTyped(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          membershipType: "PETITIONED",
          seatNumber: 1,
        }),
      );
    });

    it("should store email and phone in submissionMetadata when provided (SRS 2.1a)", async () => {
      const mockCommitteeData = createMockCommitteeData({
        email: "contact@example.com",
        phone: "555-1234",
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      setupHappyPath();

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(getMembershipMockTyped(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          membershipType: "APPOINTED",
          seatNumber: 1,
          submissionMetadata: {
            email: "contact@example.com",
            phone: "555-1234",
          },
        }),
      );
    });

    it("should return warnings and persist eligibilityWarnings in submissionMetadata when eligibility has warnings (SRS §2.2)", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      setupHappyPath();
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 2,
      });

      const response = await POST(createMockRequest(mockCommitteeData));

      type AddSuccessWithWarnings = {
        success: boolean;
        message: string;
        warnings?: Array<{ code: string; message: string }>;
      };
      const data = await parseJsonResponse<AddSuccessWithWarnings>(response);
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.warnings)).toBe(true);
      expect(data.warnings?.length).toBeGreaterThan(0);
      const firstWarning = data.warnings?.[0];
      expect(firstWarning?.code).toBe("POSSIBLY_INACTIVE");
      expect(firstWarning?.message).toContain("most recent voter file import");

      expect(getMembershipMockTyped(prismaMock).create).toHaveBeenCalledTimes(1);
      type CreateArg = { data: { submissionMetadata?: { eligibilityWarnings?: Array<{ code: string; message: string }> } } };
      const createCalls = getMembershipMockTyped(prismaMock).create.mock.calls as Array<[CreateArg]>;
      const createCallArg = createCalls[0]?.[0]?.data;
      expect(createCallArg?.submissionMetadata?.eligibilityWarnings).toBeDefined();
      const storedWarnings =
        createCallArg?.submissionMetadata?.eligibilityWarnings ?? [];
      expect(storedWarnings.length).toBeGreaterThan(0);
      expect(storedWarnings[0]?.code).toBe("POSSIBLY_INACTIVE");
      expect(storedWarnings[0]?.message).toContain("most recent voter file import");
    });

    it("should re-activate an existing non-active membership instead of creating", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      // Existing REJECTED membership → should be re-activated via update
      getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "REJECTED" }),
      );
      getMembershipMockTyped(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(getMembershipMockTyped(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate({
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
      expect(getMembershipMockTyped(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 200 idempotent when member is already ACTIVE in this committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Member already active in this committee",
          idempotent: true,
        },
        200,
      );
      expect(getMembershipMockTyped(prismaMock).create).not.toHaveBeenCalled();
      expect(getMembershipMockTyped(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should return 422 INELIGIBLE when member is already ACTIVE in another committee", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(null);
      // Second findFirst call (inside tx): voter is ACTIVE in committee id 999
      getMembershipMockTyped(prismaMock).findFirst
        .mockResolvedValueOnce(null) // validateEligibility
        .mockResolvedValue(
          createMockMembership({ committeeListId: 999, status: "ACTIVE" }),
        );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(
        response,
        422,
        "INELIGIBLE",
      );
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("ALREADY_IN_ANOTHER_COMMITTEE");
      expect(getMembershipMockTyped(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 422 INELIGIBLE when committee is at capacity", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMockTyped(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMockTyped(prismaMock).count.mockResolvedValue(4); // at capacity

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("CAPACITY");
      expect(getMembershipMockTyped(prismaMock).create).not.toHaveBeenCalled();
    });

    it("enforces capacity under concurrent add requests", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 2 }),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      const activeSeatByVoter = new Map<string, number>();

      let txQueue = Promise.resolve();
      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (arg: unknown): Promise<unknown> => {
          if (typeof arg !== "function") {
            return arg;
          }

          const run = txQueue.then(() =>
            (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock),
          );

          txQueue = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        },
      );

      getMembershipMockTyped(prismaMock).findUnique.mockImplementation(
        async (args: {
          where: {
            voterRecordId_committeeListId_termId: { voterRecordId: string };
          };
        }) => {
          const voterId =
            args.where.voterRecordId_committeeListId_termId.voterRecordId;
          const seatNumber = activeSeatByVoter.get(voterId);
          if (!seatNumber) return null;
          return createMockMembership({
            voterRecordId: voterId,
            status: "ACTIVE",
            seatNumber,
          });
        },
      );

      getMembershipMockTyped(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMockTyped(prismaMock).count.mockImplementation(
        async () => activeSeatByVoter.size,
      );
      getMembershipMockTyped(prismaMock).findMany.mockImplementation(
        async () =>
          Array.from(activeSeatByVoter.values()).map((seatNumber) => ({
            seatNumber,
          })),
      );
      getMembershipMockTyped(prismaMock).create.mockImplementation(
        async (args: {
          data: {
            voterRecordId: string;
            committeeListId: number;
            termId: string;
            status: string;
            seatNumber: number | null;
          };
        }) => {
          if (args.data.seatNumber != null) {
            activeSeatByVoter.set(args.data.voterRecordId, args.data.seatNumber);
          }

          return createMockMembership({
            voterRecordId: args.data.voterRecordId,
            committeeListId: args.data.committeeListId,
            termId: args.data.termId,
            status: args.data.status,
            seatNumber: args.data.seatNumber,
          });
        },
      );

      const memberIds = ["CONC-1", "CONC-2", "CONC-3", "CONC-4"];
      const responses = await Promise.all(
        memberIds.map((memberId) =>
          POST(createMockRequest(createMockCommitteeData({ memberId }))),
        ),
      );

      const outcomes = await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          body: (await response.json()) as Record<string, unknown>,
        })),
      );

      const acceptedCount = outcomes.filter(
        (outcome) =>
          outcome.status === 200 &&
          outcome.body.message === "Member added to committee",
      ).length;
      const capacityRejectedCount = outcomes.filter(
        (outcome) =>
          outcome.status === 422 &&
          outcome.body.error === "INELIGIBLE" &&
          Array.isArray(outcome.body.reasons) &&
          outcome.body.reasons.includes("CAPACITY"),
      ).length;

      expect(acceptedCount).toBe(2);
      expect(capacityRejectedCount).toBe(2);
      expect(activeSeatByVoter.size).toBe(2);
    });

    it("should return 422 INELIGIBLE when voter not in DB (NOT_REGISTERED)", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      prismaMock.voterRecord.findUnique.mockResolvedValue(null); // voter not found

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("NOT_REGISTERED");
      expect(getMembershipMockTyped(prismaMock).create).not.toHaveBeenCalled();
    });

    it("should return 200 idempotent for P2002 (unique constraint)", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
      setupEligibilityPassTyped(prismaMock);
      getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMockTyped(prismaMock).create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "5.0.0",
        }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Member already connected to committee (idempotent)",
          idempotent: true,
        },
        200,
      );
    });

    it("should return 500 for generic database error", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    it("should return 500 for non-P2025 PrismaClientKnownRequestError", async () => {
      const mockCommitteeData = createMockCommitteeData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig(),
      );
      prismaMock.committeeList.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Some DB error", {
          code: "P2000",
          clientVersion: "5.0.0",
        }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    // Audit log tests (SRS 1.5c)
    describe("Audit logging", () => {
      it("should log MEMBER_ACTIVATED audit event after successful add", async () => {
        const mockCommitteeData = createMockCommitteeData();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);
        setupHappyPath();

        await POST(createMockRequest(mockCommitteeData));

        expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
          expectAuditLogCreate({
            action: "MEMBER_ACTIVATED",
            entityType: "CommitteeMembership",
            entityId: "membership-test-id-001",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            afterValue: expect.objectContaining({ status: "ACTIVE" }),
          }),
        );
      });

      it("should NOT log audit event for idempotent no-op (already ACTIVE)", async () => {
        const mockCommitteeData = createMockCommitteeData();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig(),
        );
        prismaMock.committeeList.upsert.mockResolvedValue(createMockCommittee());
        getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({ status: "ACTIVE" }),
        );

        await POST(createMockRequest(mockCommitteeData));

        expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalled();
      });

      it("should still return success if audit log fails", async () => {
        const mockCommitteeData = createMockCommitteeData();
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);
        setupHappyPath();
        getAuditLogMock(prismaMock).create.mockRejectedValue(
          new Error("Audit log write failed"),
        );

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectSuccessResponse(
          response,
          { success: true, message: "Member added to committee" },
          200,
        );
      });
    });

    // Parameterized validation tests
    test.each([
      ...validationTestCases.missingFields,
      ...validationTestCases.invalidElectionDistrict,
    ])(
      "should return 422 for $field validation failure",
      async ({ field, value, expectedError }) => {
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value },
          false,
        );
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectErrorResponse(response, 422, expectedError);
        expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
      },
    );

    test.each(validationTestCases.invalidNumeric)(
      "should return 422 for invalid numeric $field",
      async ({ field, value, expectedError }) => {
        const mockCommitteeData = createMockCommitteeData(
          { [field]: value },
          false,
        );
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockCommitteeData));

        await expectErrorResponse(response, 422, expectedError);
        expect(prismaMock.committeeList.upsert).not.toHaveBeenCalled();
      },
    );

    // Authentication tests
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/add",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest(createMockCommitteeData()),
      };

      const setupMocks = () => {
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig(),
        );
        prismaMock.committeeList.upsert.mockResolvedValue(
          createMockCommittee(),
        );
        setupEligibilityPassTyped(prismaMock);
        getMembershipMockTyped(prismaMock).findUnique.mockResolvedValue(null);
        getMembershipMockTyped(prismaMock).create.mockResolvedValue(
          createMockMembership({ status: "ACTIVE" }),
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
        200,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });
  });
});
