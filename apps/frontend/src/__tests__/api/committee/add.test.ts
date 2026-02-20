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
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

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
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).create.mockResolvedValue(
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
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
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
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
        expectMembershipCreate({
          membershipType: "PETITIONED",
          seatNumber: 1,
        }),
      );
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
      setupEligibilityPass(prismaMock);
      // Existing REJECTED membership → should be re-activated via update
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "REJECTED" }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectSuccessResponse(
        response,
        { success: true, message: "Member added to committee" },
        200,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate({
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber: 1,
        }),
      );
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
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
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
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
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
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
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      // Second findFirst call (inside tx): voter is ACTIVE in committee id 999
      getMembershipMock(prismaMock).findFirst
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
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
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
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(4); // at capacity

      const response = await POST(createMockRequest(mockCommitteeData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("CAPACITY");
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
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
      setupEligibilityPass(prismaMock);
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

      getMembershipMock(prismaMock).findUnique.mockImplementation(
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

      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockImplementation(
        async () => activeSeatByVoter.size,
      );
      getMembershipMock(prismaMock).findMany.mockImplementation(
        async () =>
          Array.from(activeSeatByVoter.values()).map((seatNumber) => ({
            seatNumber,
          })),
      );
      getMembershipMock(prismaMock).create.mockImplementation(
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
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
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
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).create.mockRejectedValue(
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
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
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
        setupEligibilityPass(prismaMock);
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
        getMembershipMock(prismaMock).create.mockResolvedValue(
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
