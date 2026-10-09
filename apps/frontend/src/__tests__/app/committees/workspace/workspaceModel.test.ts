import {
  buildWorkspaceHref,
  parseWorkspaceUrlState,
} from "~/app/committees/workspace/workspaceUrlState";
import {
  EMPTY_GRID_FILTERS,
  filterRollups,
  formatTownName,
  groupRollupsByTown,
  legDistrictsForTown,
  reconcileUrlState,
} from "~/app/committees/workspace/gridModel";
import type { EdRollup, RosterFilters } from "~/lib/validations/committee";

function rollup(
  committeeListId: number,
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
  overrides: Partial<EdRollup> = {},
): EdRollup {
  return {
    committeeListId,
    cityTown,
    legDistrict,
    electionDistrict,
    filled: 2,
    totalSeats: 4,
    unassignedCount: 0,
    pendingCount: 0,
    designationWeight: null,
    missingWeightSeatNumbers: [],
    ...overrides,
  };
}

const A = rollup(1, "GREECE", 1, 1, { missingWeightSeatNumbers: [2] });
const B = rollup(2, "GREECE", 1, 12, { filled: 4, pendingCount: 1 });
const C = rollup(3, "ROCHESTER", 28, 1);
const D = rollup(4, "ROCHESTER", 29, 1);
const SCOPE: RosterFilters = {
  towns: ["GREECE", "ROCHESTER"],
  legDistricts: [
    { cityTown: "GREECE", legDistrict: 1 },
    { cityTown: "ROCHESTER", legDistrict: 28 },
    { cityTown: "ROCHESTER", legDistrict: 29 },
  ],
};

describe("parseWorkspaceUrlState", () => {
  it("reads committee, tab, town, and ld", () => {
    expect(
      parseWorkspaceUrlState(
        new URLSearchParams("committee=12&tab=seats&town=GREECE&ld=3"),
      ),
    ).toEqual({ committeeId: 12, tab: "seats", town: "GREECE", ld: 3 });
  });

  it.each([
    ["committee=abc&ld=-1&tab=nope&town=", "garbage"],
    ["committee=1.5&ld=0", "non-positive / fractional ids"],
    ["", "empty"],
  ])("treats invalid values as absent (%s: %s)", (query) => {
    expect(parseWorkspaceUrlState(new URLSearchParams(query))).toEqual({
      committeeId: null,
      tab: "roster",
      town: null,
      ld: null,
    });
  });

  it("tolerates null params", () => {
    expect(parseWorkspaceUrlState(null).tab).toBe("roster");
  });
});

describe("buildWorkspaceHref", () => {
  const current = new URLSearchParams("town=GREECE&ld=1&variant=x");

  it("sets, removes, and leaves params per the patch", () => {
    expect(
      buildWorkspaceHref("/committees", current, { committee: 7, ld: null }),
    ).toBe("/committees?town=GREECE&variant=x&committee=7");
  });

  it("returns the bare path when nothing remains", () => {
    expect(
      buildWorkspaceHref("/committees", new URLSearchParams("town=A"), {
        town: null,
      }),
    ).toBe("/committees");
  });

  it("does not mutate the current params", () => {
    buildWorkspaceHref("/committees", current, { town: null });
    expect(current.get("town")).toBe("GREECE");
  });
});

describe("filterRollups", () => {
  const all = [A, B, C, D];
  const ids = (rs: EdRollup[]) => rs.map((r) => r.committeeListId);

  it("filters by town and LD", () => {
    expect(ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, town: "ROCHESTER" }))).toEqual([3, 4]);
    expect(
      ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, town: "ROCHESTER", ld: 29 })),
    ).toEqual([4]);
  });

  it("matches a numeric query to the exact ED and text to the town", () => {
    expect(ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, query: "1" }))).toEqual([1, 3, 4]);
    expect(ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, query: "roch" }))).toEqual([3, 4]);
  });

  it("applies quick filters from the server's rollup fields", () => {
    expect(ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, onlyOpenSeats: true }))).toEqual([1, 3, 4]);
    expect(ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, onlyPending: true }))).toEqual([2]);
    expect(ids(filterRollups(all, { ...EMPTY_GRID_FILTERS, onlyMissingWeight: true }))).toEqual([1]);
  });
});

describe("groupRollupsByTown", () => {
  it("groups in input order with per-town summaries", () => {
    const groups = groupRollupsByTown([A, B, C, D]);
    expect(groups.map((g) => g.town)).toEqual(["GREECE", "ROCHESTER"]);
    expect(groups[0]?.summary).toMatchObject({ edCount: 2, vacant: 2, pendingCount: 1 });
    expect(groups[0]?.multipleLegDistricts).toBe(false);
    expect(groups[1]?.multipleLegDistricts).toBe(true);
  });
});

describe("legDistrictsForTown", () => {
  it("lists a town's LDs, or every LD without a town", () => {
    expect(legDistrictsForTown(SCOPE, "ROCHESTER")).toEqual([28, 29]);
    expect(legDistrictsForTown(SCOPE, null)).toEqual([1, 28, 29]);
  });
});

describe("reconcileUrlState", () => {
  it("returns null when everything is valid", () => {
    expect(
      reconcileUrlState({ committeeId: 3, town: "ROCHESTER", ld: 28 }, SCOPE, [C]),
    ).toBeNull();
  });

  it("clears a committee that is not visible", () => {
    expect(
      reconcileUrlState({ committeeId: 1, town: null, ld: null }, SCOPE, [C, D]),
    ).toEqual({ committee: null });
  });

  it("clears a town outside the scope, and an LD that is invalid without it", () => {
    expect(
      reconcileUrlState({ committeeId: null, town: "PENFIELD", ld: 5 }, SCOPE, []),
    ).toEqual({ town: null, ld: null });
  });

  it("keeps an LD that is valid scope-wide when only the town was invalid", () => {
    expect(
      reconcileUrlState({ committeeId: null, town: "PENFIELD", ld: 28 }, SCOPE, []),
    ).toEqual({ town: null });
  });

  it("clears an LD that does not belong to the chosen town", () => {
    expect(
      reconcileUrlState({ committeeId: null, town: "GREECE", ld: 28 }, SCOPE, [A, B]),
    ).toEqual({ ld: null });
  });
});

describe("formatTownName", () => {
  it("title-cases stored town names", () => {
    expect(formatTownName("NORTH CHILI")).toBe("North Chili");
    expect(formatTownName("GREECE")).toBe("Greece");
  });
});
