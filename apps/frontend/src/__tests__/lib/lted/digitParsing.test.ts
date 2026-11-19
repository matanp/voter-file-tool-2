import {
  isAllZeroTownCode,
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

  describe("isAllZeroTownCode", () => {
    it.each(["0", "000", "0000", " 00 ", "0.0", 0])(
      "treats %p as all zeros",
      (value) => {
        expect(isAllZeroTownCode(value)).toBe(true);
      },
    );

    it.each(["080", "80", "", null, "A1", "100"])(
      "does not treat %p as all zeros",
      (value) => {
        expect(isAllZeroTownCode(value)).toBe(false);
      },
    );

    it("leaves normalizeTownCode accepting 000 for imports", () => {
      expect(normalizeTownCode("0")).toBe("000");
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
