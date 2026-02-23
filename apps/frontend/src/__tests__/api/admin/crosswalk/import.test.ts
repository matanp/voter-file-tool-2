/**
 * SRS 3.7 — Tests for POST /api/admin/crosswalk/import.
 */

import { type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { POST } from "~/app/api/admin/crosswalk/import/route";
import { parseJsonResponse, createMockSession, getMockCallArgs } from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";
import * as xlsx from "xlsx";

jest.mock("xlsx", () => ({
  read: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}));

const readWorkbookMock = xlsx.read as jest.Mock;
const sheetToJsonMock = xlsx.utils.sheet_to_json as jest.Mock;

function createUploadFile(): { arrayBuffer: () => Promise<ArrayBuffer> } {
  return {
    arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer),
  };
}

function createFormDataRequest(file: unknown): NextRequest {
  return {
    formData: jest.fn().mockResolvedValue({
      get: () => file,
    }),
  } as unknown as NextRequest;
}

describe("/api/admin/crosswalk/import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
    mockHasPermission(true);
    (prismaMock.ltedDistrictCrosswalk as { findUnique: jest.Mock }).findUnique.mockResolvedValue(null);
    (prismaMock.ltedDistrictCrosswalk as { upsert: jest.Mock }).upsert.mockResolvedValue({ id: "x1" });
    (prismaMock.auditLog as { create: jest.Mock }).create.mockResolvedValue({});
  });

  it("returns 400 when no file provided", async () => {
    const response = await POST(createFormDataRequest(null));
    expect(response.status).toBe(400);
    const json = await parseJsonResponse<{ error: string }>(response);
    expect(json.error).toContain("Excel file");
  });

  it("parses valid rows and upserts crosswalk entries", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([
      {
        town: "080",
        ward: "17",
        district: "1",
        stleg_dist: "131",
        stsen_dist: "55",
        cong_dist: "25",
        othr_dist1: "004",
      },
    ]);

    const response = await POST(createFormDataRequest(createUploadFile()));
    expect(response.status).toBe(200);
    const json = await parseJsonResponse<{ success: boolean; summary: unknown }>(response);
    expect(json.success).toBe(true);
    expect(json.summary).toMatchObject({
      rowsProcessed: 1,
      created: 1,
      updated: 0,
      skipped: 0,
    });
    const upsertArgs = getMockCallArgs(
      (prismaMock.ltedDistrictCrosswalk as { upsert: jest.Mock }).upsert,
    )[0];
    expect(upsertArgs).toMatchObject({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: "ROCHESTER",
          legDistrict: 17,
          electionDistrict: 1,
        },
      },
      create: {
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
        stateAssemblyDistrict: "131",
      },
    });
  });

  it("skips rows with unknown town code and reports errors", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { town: "999", ward: "1", district: "1", stleg_dist: "131" },
    ]);

    const response = await POST(createFormDataRequest(createUploadFile()));
    expect(response.status).toBe(200);
    const json = await parseJsonResponse<{ success: boolean; summary: { skipped: number; errors: unknown[] } }>(response);
    expect(json.success).toBe(true);
    expect(json.summary.skipped).toBe(1);
    expect(json.summary.errors.length).toBeGreaterThan(0);
    expect((prismaMock.ltedDistrictCrosswalk as { upsert: jest.Mock }).upsert).not.toHaveBeenCalled();
  });

  it("logs CROSSWALK_IMPORTED audit event", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([]);

    await POST(createFormDataRequest(createUploadFile()));
    const auditArgs = getMockCallArgs(
      (prismaMock.auditLog as { create: jest.Mock }).create,
    )[0];
    expect(auditArgs).toMatchObject({
      data: {
        action: "CROSSWALK_IMPORTED",
        entityType: "LtedDistrictCrosswalk",
      },
    });
  });
});
