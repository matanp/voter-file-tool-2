import { convertStringToDateTime } from "~/app/api/lib/utils";

// The suite runs in America/New_York (jest.globalSetup.cjs), where a
// local-midnight parse would land at 04:00Z/05:00Z instead of UTC midnight.
describe("convertStringToDateTime", () => {
  it("parses mm/dd/yyyy to UTC midnight of that day", () => {
    expect(convertStringToDateTime("03/05/1972").toISOString()).toBe(
      "1972-03-05T00:00:00.000Z",
    );
    expect(convertStringToDateTime('"07/04/1980"').toISOString()).toBe(
      "1980-07-04T00:00:00.000Z",
    );
  });

  it("throws on a malformed date", () => {
    expect(() => convertStringToDateTime("1972-03-05")).toThrow(
      "Invalid date format. Expected mm/dd/yyyy",
    );
  });
});
