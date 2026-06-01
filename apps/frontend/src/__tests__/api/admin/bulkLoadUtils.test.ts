import {
  accumulateCommitteeMember,
  type CommitteeAccumulationEntry,
} from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";

const BRIGHTON_45_35 = {
  cityTown: "BRIGHTON",
  legDistrict: 45,
  electionDistrict: 35,
};

function createCommitteeData(): Map<string, CommitteeAccumulationEntry> {
  return new Map();
}

describe("accumulateCommitteeMember", () => {
  it("appends multiple clean members to the same LT/ED", () => {
    const committeeData = createCommitteeData();
    const mapKey = "BRIGHTON-45-35";

    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_A",
      false,
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_B",
      false,
    );

    expect(committeeData.get(mapKey)?.committeeMembers).toEqual([
      "VOTER_A",
      "VOTER_B",
    ]);
  });

  it("preserves clean members when a later discrepancy row shares the LT/ED", () => {
    const committeeData = createCommitteeData();
    const mapKey = "BRIGHTON-45-35";

    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_A",
      false,
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_B",
      false,
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_C",
      true,
    );

    expect(committeeData.get(mapKey)?.committeeMembers).toEqual([
      "VOTER_A",
      "VOTER_B",
    ]);
  });

  it("allows clean members to be added after an initial discrepancy row", () => {
    const committeeData = createCommitteeData();
    const mapKey = "BRIGHTON-45-35";

    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_C",
      true,
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_A",
      false,
    );
    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_B",
      false,
    );

    expect(committeeData.get(mapKey)?.committeeMembers).toEqual([
      "VOTER_A",
      "VOTER_B",
    ]);
  });

  it("creates an empty LT/ED entry for a discrepancy-only committee slot", () => {
    const committeeData = createCommitteeData();
    const mapKey = "BRIGHTON-45-35";

    accumulateCommitteeMember(
      committeeData,
      mapKey,
      BRIGHTON_45_35,
      "VOTER_C",
      true,
    );

    expect(committeeData.get(mapKey)).toEqual({
      data: BRIGHTON_45_35,
      committeeMembers: [],
    });
  });
});
