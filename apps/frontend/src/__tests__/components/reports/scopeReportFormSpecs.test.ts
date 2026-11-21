import {
  defaultScopedReportName,
  formatScopedReportDefaultDate,
  last30DaysIsoRange,
} from "~/components/reports/scopeReportFormSpecs";

// 6:19pm Pacific on Nov 20 is already Nov 21 in UTC: the window where the server (UTC) and a
// Pacific browser disagree on the date.
const PACIFIC_EVENING = new Date("2026-11-21T02:19:00Z");

describe("scopeReportFormSpecs date helpers", () => {
  describe("in a time zone where UTC is already on the next day", () => {
    const tz = "America/Los_Angeles";

    it("formats the default report name with the local date", () => {
      expect(formatScopedReportDefaultDate(PACIFIC_EVENING, tz)).toBe(
        "November 20, 2026",
      );
      expect(
        defaultScopedReportName("Vacancy Report", PACIFIC_EVENING, tz),
      ).toBe("Vacancy Report - November 20, 2026");
    });

    it("builds the 30-day range from local calendar days", () => {
      expect(last30DaysIsoRange(PACIFIC_EVENING, tz)).toEqual({
        from: "2026-10-21",
        to: "2026-11-20",
      });
    });
  });

  it("uses the UTC date in UTC", () => {
    expect(formatScopedReportDefaultDate(PACIFIC_EVENING, "UTC")).toBe(
      "November 21, 2026",
    );
    expect(last30DaysIsoRange(PACIFIC_EVENING, "UTC")).toEqual({
      from: "2026-10-22",
      to: "2026-11-21",
    });
  });

  it("crosses month and year boundaries", () => {
    expect(
      last30DaysIsoRange(new Date("2026-01-16T04:30:00Z"), "America/New_York"),
    ).toEqual({ from: "2025-12-16", to: "2026-01-15" });
  });

  it("is not shifted by a DST change inside the range", () => {
    // DST ends Nov 1, 2026 in New York; just after local midnight must still be Nov 20.
    expect(
      last30DaysIsoRange(new Date("2026-11-20T05:15:00Z"), "America/New_York"),
    ).toEqual({ from: "2026-10-21", to: "2026-11-20" });
  });

  it("defaults to the runtime's own time zone", () => {
    const now = new Date();
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(last30DaysIsoRange(now)).toEqual(last30DaysIsoRange(now, zone));
    expect(formatScopedReportDefaultDate(now)).toBe(
      formatScopedReportDefaultDate(now, zone),
    );
  });
});
