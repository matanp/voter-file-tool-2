/**
 * SRS 3.7 — Tests for POST and GET /api/admin/crosswalk.
 */

import { PrivilegeLevel } from "@prisma/client";
import { POST, GET } from "~/app/api/admin/crosswalk/route";
import { createMockSession, createMockRequest, parseJsonResponse } from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";

const crosswalkMock = prismaMock.ltedDistrictCrosswalk as {
  upsert: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
};

describe("POST /api/admin/crosswalk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
    mockHasPermission(true);
    crosswalkMock.upsert.mockResolvedValue({
      id: "x1",
      cityTown: "ROCHESTER",
      legDistrict: 17,
      electionDistrict: 1,
      stateAssemblyDistrict: "131",
    });
  });

  it("creates crosswalk entry and returns record", async () => {
    const body = {
      cityTown: "ROCHESTER",
      legDistrict: 17,
      electionDistrict: 1,
      stateAssemblyDistrict: "131",
      stateSenateDistrict: "55",
    };
    const response = await POST(createMockRequest(body));
    expect(response.status).toBe(200);
    const data = await parseJsonResponse<{ cityTown: string }>(response);
    expect(data.cityTown).toBe("ROCHESTER");
    expect(crosswalkMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: "ROCHESTER",
            legDistrict: 17,
            electionDistrict: 1,
          },
        },
      }),
    );
  });

  it("returns 422 for invalid body", async () => {
    const response = await POST(createMockRequest({ cityTown: "" }));
    expect(response.status).toBe(422);
  });
});

describe("GET /api/admin/crosswalk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
    mockHasPermission(true);
    crosswalkMock.findMany.mockResolvedValue([
      {
        id: "x1",
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
        stateAssemblyDistrict: "131",
      },
    ]);
    crosswalkMock.count.mockResolvedValue(1);
    const auditLogMock = prismaMock.auditLog as { create: jest.Mock; findFirst?: jest.Mock };
    if (!auditLogMock.findFirst) {
      (auditLogMock as { findFirst: jest.Mock }).findFirst = jest.fn();
    }
    (auditLogMock.findFirst!).mockResolvedValue({
      timestamp: new Date("2025-01-15"),
    });
    (prismaMock.committeeGovernanceConfig as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
      requireAssemblyDistrictMatch: true,
    });
  });

  it("returns paginated list with lastImported", async () => {
    const response = await GET(
      createMockRequest({}, { page: "1", pageSize: "25" }, { method: "GET" }),
    );
    expect(response.status).toBe(200);
    const data = await parseJsonResponse<{ data: unknown[]; total: number; lastImported: string | null }>(response);
    expect(data.data).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.lastImported).toBeDefined();
  });
});
