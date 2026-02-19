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
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null); // not in another committee
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(2); // under capacity
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
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "REJECTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectSuccessResponse(
        response,
        { message: "Request rejected" },
        200,
      );
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "REJECTED" },
          { id: "membership-test-id-001" },
        ),
      );
      // Reject should not check governance config or capacity
      expect(
        prismaMock.committeeGovernanceConfig.findFirst,
      ).not.toHaveBeenCalled();
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

    it("should return 400 when accepting and member is ACTIVE in another committee", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(
        createMockMembership({ committeeListId: 999, status: "ACTIVE" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        400,
        "Member is already in another committee",
      );
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("should reject (REJECTED) when committee is at capacity and return 400", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ status: "SUBMITTED" }),
      );
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
        createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(4); // at capacity
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({ status: "REJECTED" }),
      );

      const response = await POST(createMockRequest(mockRequestData));

      await expectErrorResponse(
        response,
        400,
        "Committee already at capacity",
      );
      // Should update membership to REJECTED with rejectionNote
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate({
          status: "REJECTED",
          rejectionNote: "Committee already full",
        }),
      );
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
            afterValue: expect.objectContaining({ status: "REJECTED" }),
          }),
        );
      });

      it("should log MEMBER_REJECTED with capacity metadata when committee is full", async () => {
        const mockRequestData = createMockHandleRequestData({
          acceptOrReject: "accept",
        });
        mockAuthSession(
          createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
        );
        mockHasPermission(true);
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({ status: "SUBMITTED" }),
        );
        getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
        prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
          createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
        );
        getMembershipMock(prismaMock).count.mockResolvedValue(4); // at capacity
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
        getMembershipMock(prismaMock).update.mockResolvedValue(
          createMockMembership({ status: "REJECTED" }),
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
