import { type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { POST } from "~/app/api/admin/weightedTable/import/route";
import {
  parseJsonResponse,
  createMockSession,
  createInsufficientPrivilegeTestCases,
  createUnauthenticatedTestCase,
  getMockCallArgs,
  runAuthTest,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";
import * as xlsx from "xlsx";

jest.mock("xlsx", () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

const readWorkbookMock = xlsx.read as jest.Mock;
const sheetToJsonMock = xlsx.utils.sheet_to_json as jest.Mock;
const executeRawMock = prismaMock.$executeRaw as unknown as jest.Mock;
// jest.setup replaces prismaMock.auditLog before every test, so read it lazily.
const auditCreateMock = () =>
  (prismaMock.auditLog as { create: jest.Mock }).create;

/** Bound values of the nth $executeRaw tagged-template call (strings array dropped). */
function executeRawValues(callIndex: number): unknown[] {
  return (executeRawMock.mock.calls[callIndex] as unknown[]).slice(1);
}

type UploadFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function createUploadFile(): UploadFile {
  return {
    arrayBuffer: jest
      .fn()
      .mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer),
  };
}

function createFormDataRequest(
  files: Record<string, UploadFile | null>,
): NextRequest {
  return {
    formData: jest.fn().mockResolvedValue({
      get: (key: string) => files[key] ?? null,
    }),
  } as unknown as NextRequest;
}

type WeightedImportResponse = {
  success: boolean;
  matched: number;
  skippedNoCommittee: number;
  skippedAmbiguous: number;
};

describe("/api/admin/weightedTable/import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
    mockHasPermission(true);
    auditCreateMock().mockResolvedValue({});
  });

  describe("authorization", () => {
    // The shared generator also emits Developer, which only fails here because
    // hasPermissionFor is mocked; Developer outranks Admin, so it is left out.
    const deniedCases = [
      createUnauthenticatedTestCase(),
      ...createInsufficientPrivilegeTestCases(PrivilegeLevel.Admin).filter(
        (testCase) =>
          testCase.session?.user?.privilegeLevel !== PrivilegeLevel.Developer,
      ),
    ];

    it.each(deniedCases)("$description and writes nothing", async (testCase) => {
      await runAuthTest(
        testCase,
        POST,
        createFormDataRequest({ weightedTable: createUploadFile() }),
        mockAuthSession,
        mockHasPermission,
      );

      expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(executeRawMock).not.toHaveBeenCalled();
      expect(auditCreateMock()).not.toHaveBeenCalled();
    });
  });

  it("skips ambiguous LD/ED rows when multiple committees match and no resolver is available", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Weighted"],
      Sheets: { Weighted: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { LTED: "17001", "Weighted Vote": 120.5 },
    ]);

    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 1,
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
      },
      {
        id: 2,
        cityTown: "BRIGHTON",
        legDistrict: 17,
        electionDistrict: 1,
      },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never);

    const response = await POST(
      createFormDataRequest({
        weightedTable: createUploadFile(),
      }),
    );

    expect(response.status).toBe(200);
    const json = await parseJsonResponse<WeightedImportResponse>(response);
    expect(json).toEqual({
      success: true,
      matched: 0,
      skippedNoCommittee: 0,
      skippedAmbiguous: 1,
    });
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("uses LTED matrix mapping to target the correct committee when LD/ED is ambiguous", async () => {
    readWorkbookMock
      .mockReturnValueOnce({
        SheetNames: ["Weighted"],
        Sheets: { Weighted: {} },
      })
      .mockReturnValueOnce({
        SheetNames: ["NEW_LTED_Matrix"],
        Sheets: { NEW_LTED_Matrix: {} },
      });
    sheetToJsonMock
      .mockReturnValueOnce([{ LTED: "17001", "Weighted Vote": 128.5 }])
      .mockReturnValueOnce([
        { LTED: "17001", town: "080", ward: "017", district: "001" },
      ]);

    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 1,
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
      },
      {
        id: 2,
        cityTown: "BRIGHTON",
        legDistrict: 17,
        electionDistrict: 1,
      },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never);

    const response = await POST(
      createFormDataRequest({
        weightedTable: createUploadFile(),
        ltedMatrix: createUploadFile(),
      }),
    );

    expect(response.status).toBe(200);
    const json = await parseJsonResponse<WeightedImportResponse>(response);
    expect(json).toEqual({
      success: true,
      matched: 1,
      skippedNoCommittee: 0,
      skippedAmbiguous: 0,
    });
    expect(executeRawMock).toHaveBeenCalledTimes(2);
    expect(executeRawValues(0)).toEqual([[1], ["128.5"]]);
  });

  it("full-key via crosswalk: when crosswalk resolves unique city for LD/ED with multiple committees, updates exactly one committee", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Weighted"],
      Sheets: { Weighted: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { LTED: "17001", "Weighted Vote": 99 },
    ]);

    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 10,
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
      },
      {
        id: 20,
        cityTown: "BRIGHTON",
        legDistrict: 17,
        electionDistrict: 1,
      },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([
      { cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 1 },
    ] as never);

    const response = await POST(
      createFormDataRequest({
        weightedTable: createUploadFile(),
      }),
    );

    expect(response.status).toBe(200);
    const json = await parseJsonResponse<WeightedImportResponse>(response);
    expect(json).toEqual({
      success: true,
      matched: 1,
      skippedNoCommittee: 0,
      skippedAmbiguous: 0,
    });
    expect(executeRawValues(0)).toEqual([[10], ["99"]]);
  });

  it("skips LTED rows that are ambiguous in the matrix (same LTED maps to different city/town)", async () => {
    readWorkbookMock
      .mockReturnValueOnce({
        SheetNames: ["Weighted"],
        Sheets: { Weighted: {} },
      })
      .mockReturnValueOnce({
        SheetNames: ["NEW_LTED_Matrix"],
        Sheets: { NEW_LTED_Matrix: {} },
      });
    sheetToJsonMock
      .mockReturnValueOnce([{ LTED: "17001", "Weighted Vote": 50 }])
      .mockReturnValueOnce(
        [
          { LTED: "17001", town: "080", ward: "017", district: "001" },
          { LTED: "17001", town: "025", ward: "017", district: "001" },
        ],
      );

    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 1,
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
      },
      {
        id: 2,
        cityTown: "BRIGHTON",
        legDistrict: 17,
        electionDistrict: 1,
      },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never);

    const response = await POST(
      createFormDataRequest({
        weightedTable: createUploadFile(),
        ltedMatrix: createUploadFile(),
      }),
    );

    expect(response.status).toBe(200);
    const json = await parseJsonResponse<WeightedImportResponse>(response);
    expect(json).toEqual({
      success: true,
      matched: 0,
      skippedNoCommittee: 0,
      skippedAmbiguous: 1,
    });
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("writes all matched committees and their seat weights in two statements in one transaction", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Weighted"],
      Sheets: { Weighted: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { LTED: "17001", "Weighted Vote": 100 },
      { LTED: "17002", "Weighted Vote": "" },
      { LTED: "18001", "Weighted Vote": 30 },
      { LTED: "18001", "Weighted Vote": 12 },
    ]);

    prismaMock.committeeList.findMany.mockResolvedValue([
      { id: 1, cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 1 },
      { id: 2, cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 2 },
      { id: 3, cityTown: "ROCHESTER", legDistrict: 18, electionDistrict: 1 },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never);
    (prismaMock.committeeGovernanceConfig.findFirst as jest.Mock).mockResolvedValue({
      maxSeatsPerLted: 3,
    });

    const response = await POST(
      createFormDataRequest({ weightedTable: createUploadFile() }),
    );

    expect(response.status).toBe(200);
    const json = await parseJsonResponse<WeightedImportResponse>(response);
    expect(json.matched).toBe(4);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(executeRawMock).toHaveBeenCalledTimes(2);
    // Committee 3 appears twice; the last row wins. A blank weight clears it.
    expect(executeRawValues(0)).toEqual([[1, 2, 3], ["100", null, "12"]]);
    // Seat weight = ltedWeight / maxSeatsPerLted, null when the weight is cleared.
    const [seatIds, seatWeights] = executeRawValues(1) as [number[], string[]];
    expect(seatIds).toEqual([1, 2, 3]);
    expect(seatWeights[1]).toBeNull();
    expect(Number(seatWeights[0])).toBeCloseTo(100 / 3, 15);
    expect(seatWeights[2]).toBe("4");
  });

  it("logs a WEIGHTED_TABLE_IMPORTED audit event after the write commits", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Weighted"],
      Sheets: { Weighted: {} },
    });
    sheetToJsonMock.mockReturnValue([
      { LTED: "17001", "Weighted Vote": 100 },
      { LTED: "17002", "Weighted Vote": 80 },
      { LTED: "99001", "Weighted Vote": 10 },
    ]);

    prismaMock.committeeList.findMany.mockResolvedValue([
      { id: 1, cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 1 },
      { id: 2, cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 2 },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never);
    // Row counts affected by the committee update, then the seat update.
    executeRawMock.mockResolvedValueOnce(2).mockResolvedValueOnce(8);

    const response = await POST(
      createFormDataRequest({ weightedTable: createUploadFile() }),
    );

    expect(response.status).toBe(200);
    expect(auditCreateMock()).toHaveBeenCalledTimes(1);
    expect(getMockCallArgs(auditCreateMock())[0]).toMatchObject({
      data: {
        userId: "test-user-id",
        userRole: PrivilegeLevel.Admin,
        action: "WEIGHTED_TABLE_IMPORTED",
        entityType: "CommitteeList",
        afterValue: {
          rowsProcessed: 3,
          matched: 2,
          committeesUpdated: 2,
          seatsUpdated: 8,
          skippedNoCommittee: 1,
          skippedAmbiguous: 0,
        },
        metadata: {
          importType: "weightedTable",
          termId: "term-default-2024-2026",
          usedLtedMatrix: false,
        },
      },
    });
  });

  it("returns 500 and skips the audit event when the write fails", async () => {
    readWorkbookMock.mockReturnValue({
      SheetNames: ["Weighted"],
      Sheets: { Weighted: {} },
    });
    sheetToJsonMock.mockReturnValue([{ LTED: "17001", "Weighted Vote": 100 }]);

    prismaMock.committeeList.findMany.mockResolvedValue([
      { id: 1, cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 1 },
    ] as never);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([] as never);
    executeRawMock.mockRejectedValueOnce(new Error("connection reset"));

    const response = await POST(
      createFormDataRequest({ weightedTable: createUploadFile() }),
    );

    expect(response.status).toBe(500);
    expect(auditCreateMock()).not.toHaveBeenCalled();
  });
});
