/**
 * The Date of Birth picker returns a local Date carrying the current time of
 * day. The query must carry only the calendar day the user saw, as UTC
 * midnight. The suite runs in America/New_York (jest.globalSetup.cjs), so an
 * evening pick is already the next day in UTC.
 */
import { SearchFieldProcessor } from "~/lib/searchFieldProcessor";
import type { BaseSearchField } from "~/types/searchFields";
import type { DATE_FIELDS } from "@voter-file-tool/shared-validators";
import { EARLIEST_DATE, LATEST_DATE } from "~/lib/constants/dateBoundaries";
import { pickedDayToUtcIso } from "~/lib/dateUtils";

// 12 Dec 1960, 21:42 local: 1960-12-13T02:42Z in New York.
const eveningPick = new Date(1960, 11, 12, 21, 42, 8);

const dobField = (value: unknown): BaseSearchField =>
  ({
    name: "DOB" as (typeof DATE_FIELDS)[number],
    displayName: "Date of Birth",
    compoundType: false,
    type: "DateOfBirth",
    value,
  }) as BaseSearchField;

describe("pickedDayToUtcIso", () => {
  it("keeps the local calendar day and drops the time of day", () => {
    expect(eveningPick.toISOString()).toBe("1960-12-13T02:42:08.000Z");
    expect(pickedDayToUtcIso(eveningPick)).toBe("1960-12-12T00:00:00.000Z");
  });

  it("keeps the day before 1883, when New York ran on local mean time", () => {
    expect(pickedDayToUtcIso(new Date(1850, 6, 4, 23, 30))).toBe(
      "1850-07-04T00:00:00.000Z",
    );
  });

  it("does not remap two-digit years into the 1900s", () => {
    const pick = new Date(2000, 5, 1, 21, 0);
    pick.setFullYear(50);
    expect(pickedDayToUtcIso(pick)).toBe("0050-06-01T00:00:00.000Z");
  });
});

describe("SearchFieldProcessor DOB query", () => {
  it("sends a single date as its calendar day", () => {
    expect(
      SearchFieldProcessor.convertToQueryField(
        dobField({ mode: "single", singleDate: eveningPick }),
      ),
    ).toEqual({ field: "DOB", values: ["1960-12-12T00:00:00.000Z"] });
  });

  it("sends range ends as their calendar days", () => {
    expect(
      SearchFieldProcessor.convertToQueryField(
        dobField({
          mode: "range",
          range: {
            startDate: new Date(1960, 11, 10, 21, 42),
            endDate: eveningPick,
          },
        }),
      ),
    ).toEqual({
      field: "DOB",
      range: {
        startDate: "1960-12-10T00:00:00.000Z",
        endDate: "1960-12-12T00:00:00.000Z",
      },
    });
  });

  it("extends a single date before, keeping the picked day as the end", () => {
    expect(
      SearchFieldProcessor.convertToQueryField(
        dobField({
          mode: "single",
          singleDate: eveningPick,
          extendBefore: true,
        }),
      ),
    ).toEqual({
      field: "DOB",
      range: {
        startDate: EARLIEST_DATE.toISOString(),
        endDate: "1960-12-12T00:00:00.000Z",
      },
    });
  });

  it("extends a single date after, keeping the picked day as the start", () => {
    expect(
      SearchFieldProcessor.convertToQueryField(
        dobField({
          mode: "single",
          singleDate: eveningPick,
          extendAfter: true,
        }),
      ),
    ).toEqual({
      field: "DOB",
      range: {
        startDate: "1960-12-12T00:00:00.000Z",
        endDate: LATEST_DATE.toISOString(),
      },
    });
  });
});
