import { lookupCityTown } from "~/lib/lted/monroeTownCodes";

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
