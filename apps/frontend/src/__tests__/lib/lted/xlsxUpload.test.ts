import * as xlsx from "xlsx";
import {
  getRowValue,
  isUploadFile,
  parseXlsxBuffer,
} from "~/lib/lted/xlsxUpload";

jest.mock("xlsx", () => ({
  read: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}));

const readWorkbookMock = xlsx.read as jest.Mock;
const sheetToJsonMock = xlsx.utils.sheet_to_json as jest.Mock;

describe("xlsxUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isUploadFile", () => {
    it("accepts objects with arrayBuffer()", () => {
      expect(
        isUploadFile({ arrayBuffer: async () => new ArrayBuffer(0) }),
      ).toBe(true);
    });

    it("rejects null and non-objects", () => {
      expect(isUploadFile(null)).toBe(false);
      expect(isUploadFile("file")).toBe(false);
    });
  });

  describe("getRowValue", () => {
    it("returns the first defined header value", () => {
      expect(getRowValue({ town: "080", Town: "999" }, "town", "Town")).toBe(
        "080",
      );
      expect(getRowValue({ Town: "999" }, "town", "Town")).toBe("999");
    });

    it("returns empty string when no keys match", () => {
      expect(getRowValue({}, "town", "Town")).toBe("");
    });
  });

  describe("parseXlsxBuffer", () => {
    it("prefers NEW_LTED_Matrix when configured", () => {
      readWorkbookMock.mockReturnValue({
        SheetNames: ["Other", "NEW_LTED_Matrix"],
        Sheets: {
          Other: {},
          NEW_LTED_Matrix: { matrix: true },
        },
      });
      sheetToJsonMock.mockReturnValue([{ town: "080" }]);

      const result = parseXlsxBuffer(Buffer.from([1]), {
        sheetPreference: "preferNewLtedMatrix",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rows).toEqual([{ town: "080" }]);
      }
      expect(sheetToJsonMock).toHaveBeenCalledWith({ matrix: true });
    });

    it("uses first sheet when configured", () => {
      readWorkbookMock.mockReturnValue({
        SheetNames: ["Weighted"],
        Sheets: { Weighted: { weighted: true } },
      });
      sheetToJsonMock.mockReturnValue([{ LTED: "17001" }]);

      const result = parseXlsxBuffer(Buffer.from([1]), {
        sheetPreference: "first",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rows).toEqual([{ LTED: "17001" }]);
      }
      expect(sheetToJsonMock).toHaveBeenCalledWith({ weighted: true });
    });

    it("returns error when no sheet is found", () => {
      readWorkbookMock.mockReturnValue({
        SheetNames: [],
        Sheets: {},
      });

      const result = parseXlsxBuffer(Buffer.from([1]), {
        sheetPreference: "first",
      });

      expect(result).toEqual({ ok: false, error: "No sheet found in workbook" });
    });
  });
});
