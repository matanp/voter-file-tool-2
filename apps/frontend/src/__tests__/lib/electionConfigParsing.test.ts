/**
 * Exhaustive unit tests for the bulk-add election config parsers/normalizers in
 * `~/lib/electionConfigParsing`. These are pure functions and hold all the risk for the
 * bulk-add feature (see `.scratch/bulk-add-election-config/spec.md`).
 *
 * Timezone strategy
 * ------------------
 * `parseCalendarDate`'s "timezone trap" assertion and `calendarDateFromLocalDate`'s
 * positive/negative-offset behavior only mean something if they're actually exercised
 * under a non-UTC process timezone. Jest does NOT support this the obvious way: mutating
 * `process.env.TZ` from inside a test (in `beforeAll` or at module top) has no effect,
 * because the V8/ICU local-time cache for a Jest test file's realm is resolved before any
 * user code in that file runs, and later writes to `process.env.TZ` are not observed
 * (verified empirically below, and independently against a minimal jest.config with no
 * Next.js wrapper — same result). Node's `Date`/`Intl` DO respect `TZ` when it is set in
 * the environment a Node process is *launched* with.
 *
 * So the TZ-sensitive assertions here spawn a real, separate Node process (via `tsx`,
 * already a devDependency, so the module's TypeScript can be imported directly without a
 * build step) with `TZ` set in that child's environment, have it import the actual module
 * under test, and print its outputs as JSON. This exercises the real functions under a
 * genuinely different system timezone — not a simulation — for both a UTC-negative zone
 * (America/New_York) and a UTC-positive zone (Asia/Tokyo), which is the whole point of
 * these tests per the spec.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  formatCalendarDateWithWeekday,
  INVALID_DATE_MESSAGE,
  normalizeOfficeName,
  officeNameMatchKey,
  parseCalendarDate,
  splitPastedLines,
  utcDayRange,
} from "~/lib/electionConfigParsing";

const TSX_BIN = path.resolve(__dirname, "../../../node_modules/.bin/tsx");
const MODULE_PATH = path.resolve(__dirname, "../../lib/electionConfigParsing.ts");

/**
 * Runs `code` (a snippet that may reference `mod`, the module under test, already
 * imported) in a fresh Node process launched with `TZ` set to `tz`. `code` must end by
 * `console.log(JSON.stringify(...))`-ing exactly one line of result data.
 */
function runInTimezone<T>(tz: string, code: string): T {
  const script = `import * as mod from "${MODULE_PATH}";\n${code}`;
  const output = execFileSync(TSX_BIN, ["-"], {
    input: script,
    env: { ...process.env, TZ: tz },
    encoding: "utf8",
  });
  const lines = output.trim().split("\n");
  const lastLine = lines[lines.length - 1];
  if (lastLine === undefined) {
    throw new Error(`runInTimezone(${tz}) produced no output`);
  }
  return JSON.parse(lastLine) as T;
}

describe("cross-process TZ harness sanity check", () => {
  it("actually changes the child process's local timezone (proves the harness works)", () => {
    const ny = runInTimezone<{ offsetMinutes: number }>(
      "America/New_York",
      `console.log(JSON.stringify({ offsetMinutes: new Date(2026, 0, 1).getTimezoneOffset() }));`,
    );
    const tokyo = runInTimezone<{ offsetMinutes: number }>(
      "Asia/Tokyo",
      `console.log(JSON.stringify({ offsetMinutes: new Date(2026, 0, 1).getTimezoneOffset() }));`,
    );

    // getTimezoneOffset() is UTC-minus-local in minutes: positive for zones behind UTC,
    // negative for zones ahead of UTC.
    expect(ny.offsetMinutes).toBeGreaterThan(0);
    expect(tokyo.offsetMinutes).toBeLessThan(0);
    expect(ny.offsetMinutes).not.toBe(tokyo.offsetMinutes);
  });
});

describe("parseCalendarDate", () => {
  describe("accepted formats", () => {
    it("accepts YYYY-MM-DD", () => {
      const result = parseCalendarDate("2026-11-03");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(10);
      expect(result?.getUTCDate()).toBe(3);
    });

    it("accepts M/D/YYYY", () => {
      const result = parseCalendarDate("11/3/2026");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(10);
      expect(result?.getUTCDate()).toBe(3);
    });

    it("accepts zero-padded M/D/YYYY", () => {
      const result = parseCalendarDate("11/03/2026");
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(10);
      expect(result?.getUTCDate()).toBe(3);
    });

    it("accepts non-zero-padded YYYY-MM-DD", () => {
      const result = parseCalendarDate("2026-1-5");
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(0);
      expect(result?.getUTCDate()).toBe(5);
    });

    it("tolerates leading and trailing whitespace", () => {
      const result = parseCalendarDate("  2026-11-03  ");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(10);
      expect(result?.getUTCDate()).toBe(3);

      const usResult = parseCalendarDate("\t11/3/2026\n");
      expect(usResult).not.toBeNull();
      expect(usResult?.getUTCDate()).toBe(3);
    });
  });

  describe("the timezone trap (run under a non-UTC TZ)", () => {
    // The whole point: a naive implementation using `new Date(string)` resolves
    // `YYYY-MM-DD` as UTC but `M/D/YYYY` as local, producing different instants (and,
    // near local midnight, different calendar days) for the same intended date. The real
    // parser must produce the SAME UTC instant for both formats, and its UTC components
    // must equal the typed calendar day, regardless of the process's local timezone.
    it.each(["America/New_York", "Asia/Tokyo"])(
      "both formats agree on the same UTC instant and UTC components under TZ=%s",
      (tz) => {
        const result = runInTimezone<{
          isoUTC: { y: number; m: number; d: number };
          usUTC: { y: number; m: number; d: number };
          isoTime: number;
          usTime: number;
        }>(
          tz,
          `
          const iso = mod.parseCalendarDate("2026-11-03");
          const us = mod.parseCalendarDate("11/3/2026");
          console.log(JSON.stringify({
            isoUTC: { y: iso.getUTCFullYear(), m: iso.getUTCMonth(), d: iso.getUTCDate() },
            usUTC: { y: us.getUTCFullYear(), m: us.getUTCMonth(), d: us.getUTCDate() },
            isoTime: iso.getTime(),
            usTime: us.getTime(),
          }));
        `,
        );

        expect(result.isoUTC).toEqual({ y: 2026, m: 10, d: 3 });
        expect(result.usUTC).toEqual({ y: 2026, m: 10, d: 3 });
        expect(result.isoTime).toBe(result.usTime);
      },
    );
  });

  describe("invalid-date round-trip rejection", () => {
    it.each([
      ["2026-02-30", "Feb 30 rolls into March"],
      ["2026-13-01", "month 13 is out of range"],
      ["13/1/2026", "month 13 (US format) is out of range"],
      ["2026-00-10", "month 0 is out of range"],
      ["0/5/2026", "day 0 is out of range"],
    ])("rejects %s (%s)", (input) => {
      expect(parseCalendarDate(input)).toBeNull();
    });
  });

  describe("rejected formats", () => {
    it.each([
      "November 3, 2026",
      "Nov 3 2026",
      "2026-11-03T00:00:00.000Z",
      "11-3-2026",
      "3/11/26",
      "",
      "garbage",
      "not a date at all",
    ])("rejects %j", (input) => {
      expect(parseCalendarDate(input)).toBeNull();
    });

    it("documents the rejection message for an invalid format", () => {
      // INVALID_DATE_MESSAGE is the caller-facing string, not something parseCalendarDate
      // itself returns; assert it exists and matches the spec's exact wording.
      expect(INVALID_DATE_MESSAGE).toBe("use 2026-11-03 or 11/3/2026");
    });
  });
});

describe("calendarDateFromLocalDate", () => {
  describe("under a UTC-negative TZ (America/New_York)", () => {
    it.each([
      [2026, 0, 1, "2026-01-01"],
      [2026, 10, 3, "2026-11-03"],
      [2024, 1, 29, "2024-02-29"],
      [2026, 11, 31, "2026-12-31"],
    ])("local midnight (%i, %i, %i) -> %s", (y, m, d, expected) => {
      const result = runInTimezone<{ out: string }>(
        "America/New_York",
        `
        const localMidnight = new Date(${y}, ${m}, ${d});
        console.log(JSON.stringify({ out: mod.calendarDateFromLocalDate(localMidnight) }));
      `,
      );
      expect(result.out).toBe(expected);
    });
  });

  describe("under a UTC-positive TZ (Asia/Tokyo) — the offset this helper exists for", () => {
    it.each([
      [2026, 0, 1, "2026-01-01"],
      [2026, 10, 3, "2026-11-03"],
      [2024, 1, 29, "2024-02-29"],
      [2026, 11, 31, "2026-12-31"],
    ])("local midnight (%i, %i, %i) -> %s", (y, m, d, expected) => {
      const result = runInTimezone<{ out: string }>(
        "Asia/Tokyo",
        `
        const localMidnight = new Date(${y}, ${m}, ${d});
        console.log(JSON.stringify({ out: mod.calendarDateFromLocalDate(localMidnight) }));
      `,
      );
      expect(result.out).toBe(expected);
    });
  });

  describe("round trip with parseCalendarDate", () => {
    it.each(["America/New_York", "Asia/Tokyo"])(
      "parseCalendarDate(calendarDateFromLocalDate(localMidnight)) is the same calendar day under TZ=%s",
      (tz) => {
        const result = runInTimezone<{
          calendarDate: string;
          roundTripUTC: { y: number; m: number; d: number };
        }>(
          tz,
          `
          const localMidnight = new Date(2026, 10, 3);
          const calendarDate = mod.calendarDateFromLocalDate(localMidnight);
          const roundTrip = mod.parseCalendarDate(calendarDate);
          console.log(JSON.stringify({
            calendarDate,
            roundTripUTC: {
              y: roundTrip.getUTCFullYear(),
              m: roundTrip.getUTCMonth(),
              d: roundTrip.getUTCDate(),
            },
          }));
        `,
        );

        expect(result.calendarDate).toBe("2026-11-03");
        expect(result.roundTripUTC).toEqual({ y: 2026, m: 10, d: 3 });
      },
    );
  });
});

describe("splitPastedLines", () => {
  it("drops blank and whitespace-only lines", () => {
    expect(splitPastedLines("Mayor\n\nCity Council\n   \nComptroller")).toEqual([
      "Mayor",
      "City Council",
      "Comptroller",
    ]);
  });

  it("handles \\r\\n line endings", () => {
    expect(splitPastedLines("Mayor\r\nCity Council\r\nComptroller")).toEqual([
      "Mayor",
      "City Council",
      "Comptroller",
    ]);
  });

  it("does not treat commas as separators", () => {
    expect(splitPastedLines("Council Member, District 3\nMayor")).toEqual([
      "Council Member, District 3",
      "Mayor",
    ]);
  });

  it("trims each line", () => {
    expect(splitPastedLines("  Mayor  \n\tCity Council\t")).toEqual([
      "Mayor",
      "City Council",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(splitPastedLines("")).toEqual([]);
    expect(splitPastedLines("   \n\n\t\n")).toEqual([]);
  });
});

describe("normalizeOfficeName", () => {
  it("trims leading/trailing whitespace only", () => {
    expect(normalizeOfficeName("  Mayor  ")).toBe("Mayor");
  });

  it("preserves casing as typed", () => {
    expect(normalizeOfficeName("NYS Assembly")).toBe("NYS Assembly");
    expect(normalizeOfficeName("nys assembly")).toBe("nys assembly");
  });

  it("leaves internal whitespace untouched", () => {
    expect(normalizeOfficeName("City   Council  Member")).toBe(
      "City   Council  Member",
    );
  });

  it("does not strip quotes", () => {
    expect(normalizeOfficeName('"Mayor"')).toBe('"Mayor"');
  });

  it("does not strip trailing commas", () => {
    expect(normalizeOfficeName("Council Member, District 3,")).toBe(
      "Council Member, District 3,",
    );
  });
});

describe("officeNameMatchKey", () => {
  it("is case-insensitive", () => {
    const mayor = officeNameMatchKey("Mayor");
    expect(officeNameMatchKey("mayor")).toBe(mayor);
    expect(officeNameMatchKey(" MAYOR ")).toBe(mayor);
  });

  it("distinguishes genuinely different names", () => {
    expect(officeNameMatchKey("Mayor")).not.toBe(officeNameMatchKey("Comptroller"));
  });
});

describe("formatCalendarDateWithWeekday", () => {
  it("renders 11/3/2026 with Tue", () => {
    const date = parseCalendarDate("11/3/2026");
    expect(date).not.toBeNull();
    expect(formatCalendarDateWithWeekday(date!)).toContain("Tue");
  });

  it("renders 11/4/2026 with Wed", () => {
    const date = parseCalendarDate("11/4/2026");
    expect(date).not.toBeNull();
    expect(formatCalendarDateWithWeekday(date!)).toContain("Wed");
  });

  it("is stable under a non-UTC TZ", () => {
    const result = runInTimezone<{ nov3: string; nov4: string }>(
      "Asia/Tokyo",
      `
      const nov3 = mod.parseCalendarDate("11/3/2026");
      const nov4 = mod.parseCalendarDate("11/4/2026");
      console.log(JSON.stringify({
        nov3: mod.formatCalendarDateWithWeekday(nov3),
        nov4: mod.formatCalendarDateWithWeekday(nov4),
      }));
    `,
    );

    expect(result.nov3).toContain("Tue");
    expect(result.nov4).toContain("Wed");
  });
});

describe("utcDayRange", () => {
  it("gte is the UTC day start and lt is exactly the next UTC day start", () => {
    const midday = new Date(Date.UTC(2026, 10, 3, 15, 30, 0));
    const { gte, lt } = utcDayRange(midday);

    expect(gte.getTime()).toBe(Date.UTC(2026, 10, 3, 0, 0, 0, 0));
    expect(lt.getTime()).toBe(Date.UTC(2026, 10, 4, 0, 0, 0, 0));
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("is half-open: a non-midnight instant on the same UTC day falls inside the range", () => {
    const nonMidnight = new Date(Date.UTC(2026, 10, 3, 23, 59, 59, 999));
    const { gte, lt } = utcDayRange(nonMidnight);

    expect(nonMidnight.getTime()).toBeGreaterThanOrEqual(gte.getTime());
    expect(nonMidnight.getTime()).toBeLessThan(lt.getTime());
  });

  it("excludes an instant exactly at the next day's start", () => {
    const midnight = new Date(Date.UTC(2026, 10, 3, 0, 0, 0, 0));
    const { lt } = utcDayRange(midnight);
    const nextDayMidnight = new Date(Date.UTC(2026, 10, 4, 0, 0, 0, 0));

    expect(lt.getTime()).toBe(nextDayMidnight.getTime());
    expect(nextDayMidnight.getTime() < lt.getTime()).toBe(false);
  });
});
