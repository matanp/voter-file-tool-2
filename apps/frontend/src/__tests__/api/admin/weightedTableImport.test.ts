import { type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { POST } from "~/app/api/admin/weightedTable/import/route";
import { parseJsonResponse, createMockSession } from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";
import * as seatUtils from "~/app/api/lib/seatUtils";
import * as xlsx from "xlsx";

jest.mock("xlsx", () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

jest.mock("~/app/api/lib/seatUtils", () => ({
  recomputeSeatWeights: jest.fn(),
}));

const readWorkbookMock = xlsx.read as jest.Mock;
const sheetToJsonMock = xlsx.utils.sheet_to_json as jest.Mock;
const recomputeSeatWeightsMock = seatUtils.recomputeSeatWeights as jest.Mock;

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
    expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
    expect(recomputeSeatWeightsMock).not.toHaveBeenCalled();
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
    prismaMock.committeeList.update.mockResolvedValue({ id: 1 } as never);

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
    expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ltedWeight: 128.5 },
    });
    expect(recomputeSeatWeightsMock).toHaveBeenCalledWith(1);
    expect(prismaMock.committeeList.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 } }),
    );
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
    expect(prismaMock.committeeList.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { ltedWeight: 99 },
    });
    expect(recomputeSeatWeightsMock).toHaveBeenCalledWith(10);
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
    expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
    expect(recomputeSeatWeightsMock).not.toHaveBeenCalled();
  });
});
