import { TOWN_CODE_TO_CITY, lookupCityTown } from "~/lib/lted/monroeTownCodes";

/**
 * Checked against the 2024 LTED matrix (town -> ward), the 2026 voter file and
 * the BOE elected committee list on 2026-10-25. Codes follow alphabetical town
 * order; each town code covers one LD (45-64), except 080 (Rochester wards).
 */
const EXPECTED_TOWN_CODE_TO_CITY: Record<string, string> = {
  "005": "BRIGHTON",
  "010": "CHILI",
  "015": "CLARKSON",
  "017": "EAST ROCHESTER",
  "020": "GATES",
  "025": "GREECE",
  "030": "HAMLIN",
  "035": "HENRIETTA",
  "040": "IRONDEQUOIT",
  "045": "MENDON",
  "050": "OGDEN",
  "055": "PARMA",
  "060": "PENFIELD",
  "065": "PERINTON",
  "070": "PITTSFORD",
  "075": "RIGA",
  "080": "ROCHESTER",
  "085": "RUSH",
  "090": "SWEDEN",
  "095": "WEBSTER",
  "100": "WHEATLAND",
};

describe("TOWN_CODE_TO_CITY", () => {
  it("matches the Monroe County town-code table exactly", () => {
    expect(TOWN_CODE_TO_CITY).toEqual(EXPECTED_TOWN_CODE_TO_CITY);
  });

  it("maps each town to exactly one code", () => {
    const towns = Object.values(TOWN_CODE_TO_CITY);
    expect(new Set(towns).size).toBe(towns.length);
  });

  it.each(Object.entries(EXPECTED_TOWN_CODE_TO_CITY))(
    "resolves %s to %s in strict mode",
    (code, city) => {
      expect(lookupCityTown(code, "strict")).toBe(city);
    },
  );
});

describe("lookupCityTown", () => {
  it("returns mapped city in strict mode", () => {
    expect(lookupCityTown("080", "strict")).toBe("ROCHESTER");
  });

  it("returns null for unknown codes in strict mode", () => {
    expect(lookupCityTown("999", "strict")).toBeNull();
  });

  it("falls back to raw code in fallback mode", () => {
    expect(lookupCityTown("999", "fallback")).toBe("999");
  });

  it("returns mapped city in fallback mode", () => {
    expect(lookupCityTown("080", "fallback")).toBe("ROCHESTER");
  });
});
