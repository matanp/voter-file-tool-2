/**
 * SRS 3.1 — Tests for DELETE /api/admin/jurisdictions/[id].
 */

import { PrivilegeLevel } from "@prisma/client";
import { DELETE } from "~/app/api/admin/jurisdictions/[id]/route";
import {
  createMockSession,
  createMockRequest,
  parseJsonResponse,
  expectAuditLogCreate,
  getAuditLogMock,
  DEFAULT_ACTIVE_TERM_ID,
} from "../../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../../utils/mocks";

const userJurisdictionMock = prismaMock.userJurisdiction as {
  findUnique: jest.Mock;
  delete: jest.Mock;
};

const JURISDICTION_ID = "jur-delete-1";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/admin/jurisdictions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    userJurisdictionMock.findUnique.mockResolvedValue({
      id: JURISDICTION_ID,
      userId: "leader-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
      createdAt: new Date(),
      createdById: "admin-1",
    });
    userJurisdictionMock.delete.mockResolvedValue({});
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("deletes jurisdiction and returns 200", async () => {
    const response = await DELETE(
      createMockRequest(undefined, {}, { method: "DELETE" }),
      routeContext(JURISDICTION_ID),
    );
    expect(response.status).toBe(200);
    const data = await parseJsonResponse<{ success: true }>(response);
    expect(data.success).toBe(true);
    expect(userJurisdictionMock.delete).toHaveBeenCalledWith({
      where: { id: JURISDICTION_ID },
    });
  });

  it("logs JURISDICTION_REMOVED audit event", async () => {
    await DELETE(
      createMockRequest(undefined, {}, { method: "DELETE" }),
      routeContext(JURISDICTION_ID),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "JURISDICTION_REMOVED" }),
    );
  });

  it("returns 404 when jurisdiction not found", async () => {
    userJurisdictionMock.findUnique.mockResolvedValue(null);
    const response = await DELETE(
      createMockRequest(undefined, {}, { method: "DELETE" }),
      routeContext("nonexistent"),
    );
    expect(response.status).toBe(404);
    const data = await parseJsonResponse<{ success: false; error: string }>(response);
    expect(data.error).toContain("not found");
    expect(userJurisdictionMock.delete).not.toHaveBeenCalled();
  });
});
