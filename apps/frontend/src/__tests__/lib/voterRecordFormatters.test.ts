import { getTown, getVillageWard } from "~/lib/voterRecordFormatters";

describe("getTown", () => {
  it("formats a known code as name and code", () => {
    expect(getTown({ townCode: "095" })).toBe("WEBSTER (095)");
  });

  it("pads an unpadded code", () => {
    expect(getTown({ townCode: "95" })).toBe("WEBSTER (095)");
  });

  it("returns an unknown code as-is", () => {
    expect(getTown({ townCode: "999" })).toBe("999");
  });

  it("returns null when the code is missing or not numeric", () => {
    expect(getTown({ townCode: null })).toBeNull();
    expect(getTown({ townCode: "A1" })).toBeNull();
  });
});

describe("getVillageWard", () => {
  it.each(["WE", "NE", "01"])("returns %s", (value) => {
    expect(getVillageWard({ CC_WD_Village: value })).toBe(value);
  });

  it.each(["00", "0", "", "  ", null])(
    "returns null for %p (not in a village or ward)",
    (value) => {
      expect(getVillageWard({ CC_WD_Village: value })).toBeNull();
    },
  );
});
