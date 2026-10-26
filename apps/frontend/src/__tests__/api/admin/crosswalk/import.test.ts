/**
 * SRS 3.7 — Tests for POST /api/admin/crosswalk/import.
 */

import { type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { POST } from "~/app/api/admin/crosswalk/import/route";
import { parseJsonResponse, createMockSession, getMockCallArgs } from "../../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
  rawQueryMock,
  rawQueryValues,
} from "../../../utils/mocks";
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

const executeRawMock = rawQueryMock("$executeRaw");
const createManyMock = () => prismaMock.ltedDistrictCrosswalk.createMany as jest.Mock;

function existingRow(overrides: {
  id: string;
  electionDistrict: number;
  stateSenateDistrict: string | null;
}) {
  return {
    cityTown: "ROCHESTER",
    legDistrict: 17,
    stateAssemblyDistrict: "131",
    congressionalDistrict: null,
    countyLegDistrict: null,
    ...overrides,
  };
}

describe("/api/admin/crosswalk/import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
    mockHasPermission(true);
    (prismaMock.ltedDistrictCrosswalk.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.ltedDistrictCrosswalk.createMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prismaMock.auditLog as { create: jest.Mock }).create.mockResolvedValue({});
  });

  it("returns 400 when no file provided", async () => {
    const response = await POST(createFormDataRequest(null));
    expect(response.status).toBe(400);
    const json = await parseJsonResponse<{ error: string }>(response);
    expect(json.error).toContain("Excel file");
  });

  it("parses valid rows and creates new crosswalk entries in one createMany", async () => {
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
    expect(createManyMock()).toHaveBeenCalledWith({
      data: [
        {
          cityTown: "ROCHESTER",
          legDistrict: 17,
          electionDistrict: 1,
          stateAssemblyDistrict: "131",
          stateSenateDistrict: "55",
          congressionalDistrict: "25",
          countyLegDistrict: "004",
        },
      ],
    });
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("updates only changed rows in one statement and leaves unchanged rows alone", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { town: "080", ward: "17", district: "1", stleg_dist: "131", stsen_dist: "55" },
      { town: "080", ward: "17", district: "2", stleg_dist: "136", stsen_dist: "56" },
      { town: "080", ward: "17", district: "3", stleg_dist: "131" },
    ]);
    (prismaMock.ltedDistrictCrosswalk.findMany as jest.Mock).mockResolvedValue([
      existingRow({ id: "a", electionDistrict: 1, stateSenateDistrict: "55" }),
      existingRow({ id: "b", electionDistrict: 2, stateSenateDistrict: "55" }),
    ]);

    const response = await POST(createFormDataRequest(createUploadFile()));
    expect(response.status).toBe(200);
    const json = await parseJsonResponse<{ summary: unknown }>(response);
    expect(json.summary).toMatchObject({
      rowsProcessed: 3,
      created: 1,
      updated: 1,
      unchanged: 1,
      skipped: 0,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(createManyMock()).toHaveBeenCalledWith({
      data: [expect.objectContaining({ electionDistrict: 3 })],
    });
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(rawQueryValues(executeRawMock)).toEqual([
      ["b"],
      ["136"],
      ["56"],
      [null],
      [null],
    ]);
  });

  it("keeps the last row when a key repeats in the file", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { town: "080", ward: "17", district: "1", stleg_dist: "131" },
      { town: "080", ward: "17", district: "1", stleg_dist: "137" },
    ]);

    const response = await POST(createFormDataRequest(createUploadFile()));
    const json = await parseJsonResponse<{ summary: unknown }>(response);
    expect(json.summary).toMatchObject({ rowsProcessed: 2, created: 1, duplicates: 1 });
    expect(createManyMock()).toHaveBeenCalledWith({
      data: [expect.objectContaining({ stateAssemblyDistrict: "137" })],
    });
  });

  it("judges a repeated existing key by its last row", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { town: "080", ward: "17", district: "1", stleg_dist: "999" },
      { town: "080", ward: "17", district: "1", stleg_dist: "131" },
    ]);
    (prismaMock.ltedDistrictCrosswalk.findMany as jest.Mock).mockResolvedValue([
      existingRow({ id: "a", electionDistrict: 1, stateSenateDistrict: null }),
    ]);

    const response = await POST(createFormDataRequest(createUploadFile()));
    const json = await parseJsonResponse<{ summary: unknown }>(response);
    expect(json.summary).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 1,
      duplicates: 1,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns 500 and skips the audit event when the write fails", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["NEW_LTED_Matrix"],
      Sheets: { NEW_LTED_Matrix: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { town: "080", ward: "17", district: "1", stleg_dist: "131" },
    ]);
    createManyMock().mockRejectedValue(new Error("connection reset"));

    const response = await POST(createFormDataRequest(createUploadFile()));
    expect(response.status).toBe(500);
    expect((prismaMock.auditLog as { create: jest.Mock }).create).not.toHaveBeenCalled();
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
    expect(createManyMock()).not.toHaveBeenCalled();
    expect(executeRawMock).not.toHaveBeenCalled();
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
