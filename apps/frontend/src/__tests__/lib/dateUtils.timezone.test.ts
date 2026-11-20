// jest.globalSetup.cjs pins TZ=America/New_York, where formatting a
// UTC-midnight date in local time shows the previous day.
import { formatCalendarDateNumeric } from "~/lib/dateUtils";

describe("formatCalendarDateNumeric under a non-UTC TZ", () => {
  it("runs in a zone where local formatting would shift the day", () => {
    // Guards the premise: if TZ didn't apply, the tests below prove nothing.
    expect(
      new Date("1972-03-05T00:00:00.000Z").toLocaleDateString("en-US"),
    ).toBe("3/4/1972");
  });

  it("shows a UTC-midnight DOB on its stored calendar day", () => {
    expect(formatCalendarDateNumeric("1972-03-05T00:00:00.000Z")).toBe(
      "3/5/1972",
    );
    expect(
      formatCalendarDateNumeric(new Date("1972-03-05T00:00:00.000Z")),
    ).toBe("3/5/1972");
  });

  it("shows Pacific-midnight rows on the same calendar day", () => {
    expect(formatCalendarDateNumeric("1972-03-05T08:00:00.000Z")).toBe(
      "3/5/1972",
    );
    expect(formatCalendarDateNumeric("2003-05-26T07:00:00.000Z")).toBe(
      "5/26/2003",
    );
    // LA local mean time, pre-1883.
    expect(formatCalendarDateNumeric("1880-01-02T07:52:58.000Z")).toBe(
      "1/2/1880",
    );
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatCalendarDateNumeric("not a date")).toBe("");
  });
});
