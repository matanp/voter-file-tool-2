import {
  accumulateCommitteeMember,
  type CommitteeAccumulationEntry,
} from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";

const BRIGHTON_45_35 = {
  cityTown: "BRIGHTON",
  legDistrict: 45,
  electionDistrict: 35,
  termId: "test-term-id",
};

function createCommitteeData(): Map<string, CommitteeAccumulationEntry> {
  return new Map();
}

const sourceEntry = (vrcnum: string, sourceRow: number): RosterEntry => ({
  vrcnum,
  committee: {
    cityTown: BRIGHTON_45_35.cityTown,
    legDistrict: BRIGHTON_45_35.legDistrict,
    electionDistrict: BRIGHTON_45_35.electionDistrict,
  },
  claimed: {
    name: "TEST VOTER",
    address1: "1 MAIN ST",
    city: "BRIGHTON",
    state: "NY",
    zip: "14610",
  },
  membershipType: "PETITIONED",
  sourceRow,
});

describe("accumulateCommitteeMember", () => {
  it("indexes every intended VRCNUM in the committee", () => {
    const committeeData = createCommitteeData();
    const mapKey = "BRIGHTON-45-35";

    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      sourceEntry("VOTER_A", 2),
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      sourceEntry("VOTER_B", 3),
    );

    expect(
      Array.from(committeeData.get(mapKey)?.sourceEntriesByVoter.keys() ?? []),
    ).toEqual(["VOTER_A", "VOTER_B"]);
  });

  it("retains every source row for an identical duplicate assignment", () => {
    const committeeData = createCommitteeData();
    const mapKey = "BRIGHTON-45-35";

    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      sourceEntry("VOTER_A", 2),
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      sourceEntry("VOTER_A", 8),
    );

    const assignments = committeeData.get(mapKey)?.sourceEntriesByVoter;
    expect(Array.from(assignments?.keys() ?? [])).toEqual(["VOTER_A"]);
    expect(
      assignments?.get("VOTER_A")?.map((entry) => entry.sourceRow),
    ).toEqual([2, 8]);
  });
});
