/**
 * The discrepancy comparison takes the canonical `claimed` object — named, already-mapped
 * fields — and compares each against its voter-file counterpart.
 */
import { findDiscrepancies } from "~/app/api/lib/utils";
import type { RosterClaimedVoter } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";
import { createMockVoterRecord } from "../../utils/testUtils";

const VOTER = createMockVoterRecord({
  VRCNUM: "VRC001",
  firstName: "JOHN",
  middleInitial: "Q",
  lastName: "DOE",
  houseNum: 123,
  street: "MAIN ST",
  apartment: null,
  city: "TESTVILLE",
  state: "NY",
  zipCode: "14604",
});

const MATCHING_CLAIM: RosterClaimedVoter = {
  name: "JOHN Q DOE",
  address1: "123 MAIN ST",
  city: "TESTVILLE",
  state: "NY",
  zip: "14604",
};

describe("findDiscrepancies", () => {
  it("finds nothing when every claimed field matches the voter file", () => {
    expect(findDiscrepancies(MATCHING_CLAIM, VOTER)).toEqual({});
  });

  it("stores each disagreeing field under its existing discrepancy key", () => {
    const discrepancies = findDiscrepancies(
      {
        name: "JANE Q DOE",
        address1: "999 OTHER ST",
        city: "ELSEWHERE",
        state: "CA",
        zip: "90210",
      },
      VOTER,
    );

    expect(discrepancies).toEqual({
      name: { incoming: "JANE Q DOE", existing: "JOHN Q DOE" },
      "res address1": { incoming: "999 OTHER ST", existing: "123 MAIN ST" },
      "res city": { incoming: "ELSEWHERE", existing: "TESTVILLE" },
      "res state": { incoming: "CA", existing: "NY" },
      "res zip": { incoming: "90210", existing: "14604" },
    });
  });

  it("collapses runs of whitespace in the claimed value before comparing", () => {
    expect(
      findDiscrepancies(
        { ...MATCHING_CLAIM, name: "  JOHN   Q  DOE " },
        VOTER,
      ),
    ).toEqual({});
  });

  it("reports an empty claimed field against the voter file value", () => {
    expect(findDiscrepancies({ ...MATCHING_CLAIM, city: "" }, VOTER)).toEqual({
      "res city": { incoming: "", existing: "TESTVILLE" },
    });
  });

  it("compares only the five fields the import compares", () => {
    const discrepancies = findDiscrepancies(
      { ...MATCHING_CLAIM, name: "JANE Q DOE" },
      VOTER,
    );

    expect(Object.keys(discrepancies)).toEqual(["name"]);
  });
});
