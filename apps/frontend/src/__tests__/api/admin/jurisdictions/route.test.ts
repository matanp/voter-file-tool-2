/**
 * SRS 3.1 — Tests for POST and GET /api/admin/jurisdictions.
 */

import { PrivilegeLevel } from "@prisma/client";
import { POST, GET } from "~/app/api/admin/jurisdictions/route";
import {
  createMockSession,
  createMockRequest,
  parseJsonResponse,
  expectErrorResponse,
  expectAuditLogCreate,
  getAuditLogMock,
  DEFAULT_ACTIVE_TERM_ID,
} from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";

const userMock = prismaMock.user as { findUnique: jest.Mock };
const committeeTermMock = prismaMock.committeeTerm as { findUnique: jest.Mock };
const userJurisdictionMock = prismaMock.userJurisdiction as {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
};

describe("POST /api/admin/jurisdictions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    userMock.findUnique.mockResolvedValue({
      id: "leader-1",
      privilegeLevel: PrivilegeLevel.Leader,
    });
    committeeTermMock.findUnique.mockResolvedValue({
      id: DEFAULT_ACTIVE_TERM_ID,
    });
    userJurisdictionMock.findUnique.mockResolvedValue(null);
    userJurisdictionMock.findFirst.mockResolvedValue(null);
    userJurisdictionMock.create.mockResolvedValue({
      id: "jur-1",
      userId: "leader-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      createdAt: new Date(),
      createdById: "admin-1",
    });
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("creates jurisdiction and returns 201", async () => {
    const body = {
      userId: "leader-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(201);
    const data = await parseJsonResponse<{ success: true; jurisdiction: { id: string } }>(response);
    expect(data.success).toBe(true);
    expect(data.jurisdiction.id).toBe("jur-1");
    expect(userJurisdictionMock.create).toHaveBeenCalledWith({
      data: {
        userId: "leader-1",
        cityTown: "Rochester",
        legDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        createdById: "test-user-id",
      },
    });
  });

  it("creates jurisdiction with null legDistrict when omitted", async () => {
    const body = {
      userId: "leader-1",
      cityTown: "Rochester",
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(201);
    expect(userJurisdictionMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        legDistrict: null,
      }),
    });
  });

  it("logs JURISDICTION_ASSIGNED audit event", async () => {
    const body = {
      userId: "leader-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    await POST(createMockRequest(body));
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "JURISDICTION_ASSIGNED" }),
    );
  });

  it("returns 400 when user is not Leader", async () => {
    userMock.findUnique.mockResolvedValue({
      id: "user-1",
      privilegeLevel: PrivilegeLevel.Admin,
    });
    const body = {
      userId: "user-1",
      cityTown: "Rochester",
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(400);
    const data = await parseJsonResponse<{ success: false; error: string }>(response);
    expect(data.error).toContain("Leader");
    expect(userJurisdictionMock.create).not.toHaveBeenCalled();
  });

  it("returns 400 when user not found", async () => {
    userMock.findUnique.mockResolvedValue(null);
    const body = {
      userId: "nonexistent",
      cityTown: "Rochester",
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(400);
    expect(userJurisdictionMock.create).not.toHaveBeenCalled();
  });

  it("returns 400 when term not found", async () => {
    committeeTermMock.findUnique.mockResolvedValue(null);
    const body = {
      userId: "leader-1",
      cityTown: "Rochester",
      termId: "bad-term",
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(400);
    expect(userJurisdictionMock.create).not.toHaveBeenCalled();
  });

  it("returns 400 when jurisdiction already assigned (duplicate)", async () => {
    userJurisdictionMock.findUnique.mockResolvedValue({ id: "existing" });
    const body = {
      userId: "leader-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(400);
    const data = await parseJsonResponse<{ success: false; error: string }>(response);
    expect(data.error).toContain("already assigned");
    expect(userJurisdictionMock.create).not.toHaveBeenCalled();
  });

  it("returns 400 when duplicate 'all districts' (legDistrict omitted)", async () => {
    userJurisdictionMock.findFirst.mockResolvedValue({ id: "existing" });
    const body = {
      userId: "leader-1",
      cityTown: "Rochester",
      termId: DEFAULT_ACTIVE_TERM_ID,
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(400);
    const data = await parseJsonResponse<{ success: false; error: string }>(response);
    expect(data.error).toContain("already assigned");
    expect(userJurisdictionMock.create).not.toHaveBeenCalled();
  });

  it("returns 422 on invalid payload", async () => {
    const response = await POST(
      createMockRequest({ userId: "leader-1" /* missing cityTown, termId */ }),
    );
    await expectErrorResponse(response, 422, "Invalid request data");
  });
});

describe("GET /api/admin/jurisdictions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    userJurisdictionMock.findMany.mockResolvedValue([]);
  });

  it("returns 422 when both userId and termId are omitted", async () => {
    const response = await GET(
      createMockRequest({}, {}, { method: "GET" }),
    );
    await expectErrorResponse(response, 422, "Invalid request data");
    expect(userJurisdictionMock.findMany).not.toHaveBeenCalled();
  });

  it("returns jurisdictions list with filters", async () => {
    const jurisdictions = [
      {
        id: "j1",
        userId: "leader-1",
        cityTown: "Rochester",
        legDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        createdAt: new Date(),
        createdById: "admin-1",
        user: { name: "Leader", email: "leader@test.com" },
        term: { label: "2024–2026" },
      },
    ];
    userJurisdictionMock.findMany.mockResolvedValue(jurisdictions);

    const response = await GET(
      createMockRequest(
        {},
        { userId: "leader-1", termId: DEFAULT_ACTIVE_TERM_ID },
        { method: "GET" },
      ),
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as typeof jurisdictions;
    expect(data).toHaveLength(1);
    expect(data[0]?.cityTown).toBe("Rochester");
    expect(userJurisdictionMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "leader-1", termId: DEFAULT_ACTIVE_TERM_ID },
      }),
    );
  });
});
