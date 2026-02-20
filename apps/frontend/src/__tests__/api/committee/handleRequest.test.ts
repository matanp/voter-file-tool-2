import { POST } from "~/app/api/committee/handleRequest/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createMockGovernanceConfig,
  createMockMembership,
  expectMembershipUpdate,
  expectAuditLogCreate,
  getMembershipMock,
  getAuditLogMock,
  setupEligibilityPass,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

const createMockHandleRequestData = (overrides = {}) => ({
  membershipId: "membership-test-id-001",
  acceptOrReject: "accept" as const,
  ...overrides,
});

describe("/api/committee/handleRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/handleRequest", () => {
    it("should successfully accept a SUBMITTED membership request", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(2);
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { message: "Request accepted" },
        200,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "ACTIVE",
            membershipType: "APPOINTED",
            seatNumber: 1,
          },
          { id: "membership-test-id-001" },
        ),
      );
    });

    it("should successfully reject a SUBMITTED membership request", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "reject",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).updateMany.mockResolvedValue({ count: 1 });

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { message: "Request rejected" },
        200,
      );
      expect(getMembershipMock(prismaMock).updateMany).toHaveBeenCalledWith({
        where: { id: "membership-test-id-001", status: "SUBMITTED" },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectedAt: expect.any(Date),
        }),
      });
      // Reject should not check governance config or capacity
      expect(
        prismaMock.committeeGovernanceConfig.findFirst,
      ).not.toHaveBeenCalled();
    });

    it("should remove replacement target when accepting a request with removeMemberId", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      const submittedMembership = createMockMembership({
        id: "membership-test-id-001",
        status: "SUBMITTED",
        submissionMetadata: { removeMemberId: "OLD_MEMBER_ID" },
      });
      const replacementTargetMembership = createMockMembership({
        id: "membership-target-id-002",
        voterRecordId: "OLD_MEMBER_ID",
        status: "ACTIVE",
        seatNumber: 2,
      });

      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique
        .mockResolvedValueOnce(submittedMembership)
        .mockResolvedValueOnce(submittedMembership)
        .mockResolvedValueOnce(replacementTargetMembership);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(2);
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { message: "Request accepted" },
        200,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "REMOVED",
            removalReason: "OTHER",
          },
          { id: "membership-target-id-002" },
        ),
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "ACTIVE",
            membershipType: "APPOINTED",
          },
          { id: "membership-test-id-001" },
        ),
      );
    });

    it("should return 422 when replacement target is not found or no longer active", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      const submittedMembership = createMockMembership({
        id: "membership-test-id-001",
        status: "SUBMITTED",
        submissionMetadata: { removeMemberId: "OLD_MEMBER_ID" },
      });

      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique
        .mockResolvedValueOnce(submittedMembership)
        .mockResolvedValueOnce(submittedMembership)
        .mockResolvedValueOnce(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(2);

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        422,
        "Replacement target not found or no longer active",
      );
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "ACTIVE" },
          { id: "membership-test-id-001" },
        ),
      );
    });

    it("should accept replacement request when committee is at capacity (1.R.14)", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      const submittedMembership = createMockMembership({
        id: "membership-test-id-001",
        status: "SUBMITTED",
        submissionMetadata: { removeMemberId: "OLD_MEMBER_ID" },
      });
      const replacementTargetMembership = createMockMembership({
        id: "membership-target-id-002",
        voterRecordId: "OLD_MEMBER_ID",
        status: "ACTIVE",
        seatNumber: 2,
      });

      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).count
        .mockResolvedValueOnce(3) // validateEligibility: under capacity
        .mockResolvedValue(4); // tx: at capacity (replacement frees one)
      getMembershipMock(prismaMock).findUnique
        .mockResolvedValueOnce(submittedMembership)
        .mockResolvedValueOnce(submittedMembership)
        .mockResolvedValueOnce(replacementTargetMembership);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      // Should succeed because the replacement frees a seat
      await expectSuccessResponse(
        response,
        { message: "Request accepted" },
        200,
      );
      // Should remove the replacement target
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "REMOVED",
            removalReason: "OTHER",
          },
          { id: "membership-target-id-002" },
        ),
      );
      // Should activate the new member
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "ACTIVE",
            membershipType: "APPOINTED",
          },
          { id: "membership-test-id-001" },
        ),
      );
    });

    it("should return 404 when membership is not found", async () => {
      const mockRequestData = createMockHandleRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        404,
        "Committee membership request not found",
      );
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should return 400 when membership is not in SUBMITTED state", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        400,
        "This membership is not in a pending (SUBMITTED) state",
      );
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should return 422 INELIGIBLE when accepting and member is ACTIVE in another committee", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(
        createMockMembership({ committeeListId: 999, status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("ALREADY_IN_ANOTHER_COMMITTEE");
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should return 422 INELIGIBLE when committee is at capacity on accept", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(4); // at capacity

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 422, "INELIGIBLE");
      const body = (await response.json()) as { reasons?: string[] };
      expect(body.reasons).toContain("CAPACITY");
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("enforces capacity under concurrent accept requests", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      setupEligibilityPass(prismaMock);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 2 }),
      );
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      const membershipIds = ["m-conc-1", "m-conc-2", "m-conc-3", "m-conc-4"];
      const membershipStore = new Map(
        membershipIds.map((id, index) => [
          id,
          createMockMembership({
            id,
            voterRecordId: `VRC-CONC-${index + 1}`,
            committeeListId: 1,
            termId: "term-default-2024-2026",
            status: "SUBMITTED",
            seatNumber: null,
          }),
        ]),
      );

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
          where:
            | { id: string }
            | {
                voterRecordId_committeeListId_termId: {
                  voterRecordId: string;
                  committeeListId: number;
                  termId: string;
                };
              };
        }) => {
          if ("id" in args.where) {
            return membershipStore.get(args.where.id) ?? null;
          }

          const composite = args.where.voterRecordId_committeeListId_termId;
          return (
            Array.from(membershipStore.values()).find(
              (membership) =>
                membership.voterRecordId === composite.voterRecordId &&
                membership.committeeListId === composite.committeeListId &&
                membership.termId === composite.termId,
            ) ?? null
          );
        },
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockImplementation(async () => {
        return Array.from(membershipStore.values()).filter(
          (membership) =>
            membership.committeeListId === 1 &&
            membership.termId === "term-default-2024-2026" &&
            membership.status === "ACTIVE",
        ).length;
      });
      getMembershipMock(prismaMock).findMany.mockImplementation(async () => {
        return Array.from(membershipStore.values())
          .filter((membership) => membership.status === "ACTIVE")
          .map((membership) => ({ seatNumber: membership.seatNumber }));
      });
      getMembershipMock(prismaMock).update.mockImplementation(
        async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const existing = membershipStore.get(args.where.id);
          if (!existing) {
            throw new Error("Membership not found");
          }

          const updated = {
            ...existing,
            ...args.data,
            status: (args.data.status as string | undefined) ?? existing.status,
            seatNumber:
              (args.data.seatNumber as number | null | undefined) ??
              existing.seatNumber,
          };
          membershipStore.set(args.where.id, updated);
          return updated;
        },
      );

      const responses = await Promise.all(
        membershipIds.map((membershipId) =>
          POST(createMockRequest({ membershipId, acceptOrReject: "accept" })),
        ),
      );

      const outcomes = await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          body: (await response.json()) as Record<string, unknown>,
        })),
      );

      const acceptedCount = outcomes.filter(
        (outcome) => outcome.status === 200 && outcome.body.message === "Request accepted",
      ).length;
      const capacityRejectedCount = outcomes.filter(
        (outcome) =>
          outcome.status === 422 &&
          outcome.body.error === "INELIGIBLE" &&
          Array.isArray(outcome.body.reasons) &&
          outcome.body.reasons.includes("CAPACITY"),
      ).length;

      const activeInStore = Array.from(membershipStore.values()).filter(
        (membership) => membership.status === "ACTIVE",
      );
      const rejectedInStore = Array.from(membershipStore.values()).filter(
        (membership) => membership.status === "REJECTED",
      );

      expect(acceptedCount).toBe(2);
      expect(capacityRejectedCount).toBe(2);
      expect(activeInStore).toHaveLength(2);
      expect(rejectedInStore).toHaveLength(2);
    });

    it("should return 500 for database error", async () => {
      const mockRequestData = createMockHandleRequestData();
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      getMembershipMock(prismaMock).findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(response, 500, "Internal server error");
    });

    // Audit log tests (SRS 1.5c)
    describe("Audit logging", () => {
      it("should log MEMBER_ACTIVATED audit event after accept", async () => {
        const mockRequestData = createMockHandleRequestData({
          acceptOrReject: "accept",
        });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);
        setupEligibilityPass(prismaMock);
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({ status: "SUBMITTED" }),
        );
        getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
        );
        getMembershipMock(prismaMock).count.mockResolvedValue(2);
        getMembershipMock(prismaMock).update.mockResolvedValue(
          createMockMembership({ status: "ACTIVE" }),
        );

        await POST(createMockRequest(mockRequestData));

        expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
          expectAuditLogCreate({
            action: "MEMBER_ACTIVATED",
            entityType: "CommitteeMembership",
            entityId: "membership-test-id-001",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            afterValue: expect.objectContaining({
              status: "ACTIVE",
              membershipType: "APPOINTED",
            }),
          }),
        );
      });

      it("should log MEMBER_REJECTED audit event after reject", async () => {
        const mockRequestData = createMockHandleRequestData({
          acceptOrReject: "reject",
        });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({ status: "SUBMITTED" }),
        );
        getMembershipMock(prismaMock).updateMany.mockResolvedValue({ count: 1 });

        await POST(createMockRequest(mockRequestData));

        expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
          expectAuditLogCreate({
            action: "MEMBER_REJECTED",
            entityType: "CommitteeMembership",
            entityId: "membership-test-id-001",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            afterValue: expect.objectContaining({ status: "REJECTED" }),
          }),
        );
      });

      it("should log MEMBER_REJECTED with capacity metadata when committee becomes full in tx", async () => {
        const mockRequestData = createMockHandleRequestData({
          acceptOrReject: "accept",
        });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);
        setupEligibilityPass(prismaMock);
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({ status: "SUBMITTED" }),
        );
        getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
        );
        getMembershipMock(prismaMock).count
          .mockResolvedValueOnce(3) // validateEligibility: under capacity
          .mockResolvedValue(4); // tx: at capacity
        getMembershipMock(prismaMock).update.mockResolvedValue(
          createMockMembership({ status: "REJECTED" }),
        );

        await POST(createMockRequest(mockRequestData));

        expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
          expectAuditLogCreate({
            action: "MEMBER_REJECTED",
            entityType: "CommitteeMembership",
            entityId: "membership-test-id-001",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            metadata: expect.objectContaining({ reason: "capacity" }),
          }),
        );
      });
    });

    // Validation tests
    test.each([
      { field: "membershipId", value: "" },
      { field: "acceptOrReject", value: "invalid" },
    ])(
      "should return 422 for invalid $field",
      async ({ field, value }: { field: string; value: unknown }) => {
        const mockRequestData = createMockHandleRequestData({ [field]: value });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);

        const response = await POST(createMockRequest(mockRequestData));

        await expectErrorResponse(response, 422, "Invalid request data");
        expect(getMembershipMock(prismaMock).findUnique).not.toHaveBeenCalled();
      },
    );

    // Authentication tests
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/handleRequest",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest(
            createMockHandleRequestData({ acceptOrReject: "reject" }),
          ),
      };

      const setupMocks = () => {
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({ status: "SUBMITTED" }),
        );
        getMembershipMock(prismaMock).updateMany.mockResolvedValue({ count: 1 });
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
