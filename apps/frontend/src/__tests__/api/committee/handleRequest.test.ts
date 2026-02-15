import { POST } from "~/app/api/committee/handleRequest/route";
import { PrivilegeLevel, type VoterRecord } from "@prisma/client";
import {
  createMockSession,
  createMockCommittee,
  createMockCommitteeRequest,
  createMockVoterRecord,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

// Helper to create committee request with included committeList (schema typo)
function createMockCommitteeRequestWithInclude(overrides: {
  id?: number;
  committeeListId?: number;
  addVoterRecordId?: string | null;
  removeVoterRecordId?: string | null;
  committeeMemberList?: VoterRecord[];
} = {}) {
  const base = createMockCommitteeRequest({
    id: overrides.id ?? 1,
    committeeListId: overrides.committeeListId ?? 1,
    addVoterRecordId: overrides.addVoterRecordId ?? "TEST123456",
    removeVoterRecordId: overrides.removeVoterRecordId ?? null,
  });
  const committee = createMockCommittee({
    id: base.committeeListId,
    committeeMemberList: overrides.committeeMemberList ?? [],
  });
  return {
    ...base,
    committeList: committee,
  };
}

const createMockHandleRequestData = (overrides = {}) => ({
  committeeRequestId: 1,
  acceptOrReject: "accept" as const,
  ...overrides,
});

describe("/api/committee/handleRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/handleRequest", () => {
    it("should return 404 when committee request not found", async () => {
      const mockRequestData = createMockHandleRequestData();
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeRequest.findUnique.mockResolvedValue(null);

      const request = createMockRequest(mockRequestData);

      const response = await POST(request);

      await expectErrorResponse(response, 404, "Committee request not found");
      expect(prismaMock.committeeRequest.delete).not.toHaveBeenCalled();
    });

    it("should return 400 when accepting add and member is already in another committee", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      const mockCommitteeRequest = createMockCommitteeRequestWithInclude({
        id: 1,
        committeeListId: 1,
        addVoterRecordId: "TEST123456",
        committeeMemberList: [],
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeRequest.findUnique.mockResolvedValue(
        mockCommitteeRequest,
      );
      prismaMock.voterRecord.findUnique.mockResolvedValue(
        createMockVoterRecord({ committeeId: 999 }),
      );

      const request = createMockRequest(mockRequestData);

      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "Member is already in another committee",
      );
      expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
      expect(prismaMock.committeeRequest.delete).not.toHaveBeenCalled();
    });

    it("should succeed when accepting add and member has no committee", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "accept",
      });
      const mockCommitteeRequest = createMockCommitteeRequestWithInclude({
        addVoterRecordId: "TEST123456",
        committeeMemberList: [],
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeRequest.findUnique.mockResolvedValue(
        mockCommitteeRequest,
      );
      prismaMock.voterRecord.findUnique.mockResolvedValue(
        createMockVoterRecord({ committeeId: null }),
      );
      prismaMock.committeeList.update.mockResolvedValue(createMockCommittee());
      prismaMock.committeeRequest.delete.mockResolvedValue(
        createMockCommitteeRequest(),
      );

      const request = createMockRequest(mockRequestData);

      const response = await POST(request);

      await expectSuccessResponse(
        response,
        { message: "Request accepted" },
        200,
      );
      expect(prismaMock.committeeList.update).toHaveBeenCalled();
      expect(prismaMock.committeeRequest.delete).toHaveBeenCalled();
    });

    it("should succeed when rejecting", async () => {
      const mockRequestData = createMockHandleRequestData({
        acceptOrReject: "reject",
      });
      const mockCommitteeRequest = createMockCommitteeRequestWithInclude({
        addVoterRecordId: null,
        removeVoterRecordId: null,
      });
      const mockSession = createMockSession({
        user: { privilegeLevel: PrivilegeLevel.Admin },
      });

      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.committeeRequest.findUnique.mockResolvedValue(
        mockCommitteeRequest,
      );
      prismaMock.committeeRequest.delete.mockResolvedValue(
        createMockCommitteeRequest(),
      );

      const request = createMockRequest(mockRequestData);

      const response = await POST(request);

      await expectSuccessResponse(
        response,
        { message: "Request rejected" },
        200,
      );
      expect(prismaMock.committeeRequest.delete).toHaveBeenCalled();
      expect(prismaMock.voterRecord.findUnique).not.toHaveBeenCalled();
    });

    // Validation tests
    test.each([
      { field: "committeeRequestId", value: 0 },
      { field: "committeeRequestId", value: -1 },
      { field: "acceptOrReject", value: "invalid" },
    ])(
      "should return 422 for invalid $field",
      async ({ field, value }: { field: string; value: unknown }) => {
        const mockRequestData = createMockHandleRequestData({
          [field]: value,
        });
        const mockSession = createMockSession({
          user: { privilegeLevel: PrivilegeLevel.Admin },
        });

        mockAuthSession(mockSession);
        mockHasPermission(true);

        const request = createMockRequest(mockRequestData);

        const response = await POST(request);

        await expectErrorResponse(response, 422, "Invalid request data");
        expect(prismaMock.committeeRequest.findUnique).not.toHaveBeenCalled();
      },
    );

    // Authentication tests
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/handleRequest",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest(createMockHandleRequestData({ acceptOrReject: "reject" })),
      };

      const setupMocks = () => {
        prismaMock.committeeRequest.findUnique.mockResolvedValue(
          createMockCommitteeRequestWithInclude({
            addVoterRecordId: null,
            removeVoterRecordId: null,
          }),
        );
        prismaMock.committeeRequest.delete.mockResolvedValue(
          createMockCommitteeRequest(),
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
