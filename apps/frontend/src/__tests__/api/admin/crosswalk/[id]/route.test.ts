/**
 * SRS 3.7 — Tests for DELETE /api/admin/crosswalk/[id].
 */

import { PrivilegeLevel } from "@prisma/client";
import { DELETE } from "~/app/api/admin/crosswalk/[id]/route";
import {
  createMockSession,
  createMockRequest,
  parseJsonResponse,
  expectAuditLogCreate,
  getAuditLogMock,
} from "../../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../../utils/mocks";

const crosswalkMock = prismaMock.ltedDistrictCrosswalk as {
  findUnique: jest.Mock;
  delete: jest.Mock;
};

const CROSSWALK_ID = "crosswalk-delete-1";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/admin/crosswalk/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    crosswalkMock.findUnique.mockResolvedValue({
      id: CROSSWALK_ID,
      cityTown: "ROCHESTER",
      legDistrict: 17,
      electionDistrict: 1,
      stateAssemblyDistrict: "131",
    });
    crosswalkMock.delete.mockResolvedValue({});
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("deletes crosswalk entry and returns 200", async () => {
    const response = await DELETE(
      createMockRequest(undefined, {}, { method: "DELETE" }),
      routeContext(CROSSWALK_ID),
    );
    expect(response.status).toBe(200);
    const data = await parseJsonResponse<{ success: true }>(response);
    expect(data.success).toBe(true);
    expect(crosswalkMock.delete).toHaveBeenCalledWith({
      where: { id: CROSSWALK_ID },
    });
  });

  it("logs audit event for delete", async () => {
    await DELETE(
      createMockRequest(undefined, {}, { method: "DELETE" }),
      routeContext(CROSSWALK_ID),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "DISCREPANCY_RESOLVED",
        entityType: "LtedDistrictCrosswalk",
        metadata: { actionType: "crosswalk_delete" },
      }),
    );
  });

  it("returns 404 when crosswalk entry not found", async () => {
    crosswalkMock.findUnique.mockResolvedValue(null);
    const response = await DELETE(
      createMockRequest(undefined, {}, { method: "DELETE" }),
      routeContext("nonexistent"),
    );
    expect(response.status).toBe(404);
    const data = await parseJsonResponse<{ error: string }>(response);
    expect(data.error).toContain("not found");
    expect(crosswalkMock.delete).not.toHaveBeenCalled();
  });
});
