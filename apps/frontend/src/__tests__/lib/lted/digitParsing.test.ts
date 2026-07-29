import {
  normalizeDigits,
  normalizeTownCode,
  parseDistrictValue,
} from "~/lib/lted/digitParsing";

describe("digitParsing", () => {
  describe("normalizeTownCode", () => {
    it("accepts Excel-style decimal town codes", () => {
      expect(normalizeTownCode("80.0")).toBe("080");
    });

    it("rejects non-numeric suffixes", () => {
      expect(normalizeTownCode("80abc")).toBeNull();
    });

    it("rejects fractional values", () => {
      expect(normalizeTownCode("80.5")).toBeNull();
    });

    it("pads known town codes to three digits", () => {
      expect(normalizeTownCode("80")).toBe("080");
      expect(normalizeTownCode("080")).toBe("080");
    });
  });

  describe("parseDistrictValue", () => {
    it("accepts Excel-style decimal ward/district values", () => {
      expect(parseDistrictValue("17.0")).toBe(17);
    });

    it("rejects non-numeric suffixes", () => {
      expect(parseDistrictValue("17abc")).toBeNull();
    });
  });

  describe("normalizeDigits", () => {
    it("returns null for empty values", () => {
      expect(normalizeDigits("")).toBeNull();
      expect(normalizeDigits(null)).toBeNull();
    });
  });
});
