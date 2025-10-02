import {
  getCommitteeDisplayName,
  validateCommitteeSelection,
  isCommitteeAtCapacity,
  getAvailableSlots,
  formatLegislativeDistrict,
  requiresLegislativeDistrict,
} from "~/lib/utils/committee";
import { COMMITTEE_CONSTANTS } from "~/lib/constants/committee";
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";
import type { CommitteeList } from "@prisma/client";
import type { CommitteeSelection } from "~/lib/types/committee";

describe("committee utils", () => {
  describe("getCommitteeDisplayName", () => {
    it("should format display name for Rochester city with leg district", () => {
      const committee: CommitteeList = {
        id: 1,
        cityTown: COMMITTEE_CONSTANTS.ROCHESTER_CITY,
        legDistrict: 5,
        electionDistrict: 10,
      };

      const result = getCommitteeDisplayName(committee);
      expect(result).toBe("ROCHESTER, 5, 10");
    });

    it("should format display name for Rochester city with numeric leg district", () => {
      const committee: CommitteeList = {
        id: 1,
        cityTown: COMMITTEE_CONSTANTS.ROCHESTER_CITY,
        legDistrict: 3,
        electionDistrict: 7,
      };

      const result = getCommitteeDisplayName(committee);
      expect(result).toBe("ROCHESTER, 3, 7");
    });

    it("should format display name for non-Rochester city without leg district", () => {
      const committee: CommitteeList = {
        id: 1,
        cityTown: "BRIGHTON",
        legDistrict: 2,
        electionDistrict: 5,
      };

      const result = getCommitteeDisplayName(committee);
      expect(result).toBe("BRIGHTON, 5");
    });

    it("should format display name for non-Rochester city with sentinel leg district", () => {
      const committee: CommitteeList = {
        id: 1,
        cityTown: "PITTSFORD",
        legDistrict: LEG_DISTRICT_SENTINEL,
        electionDistrict: 3,
      };

      const result = getCommitteeDisplayName(committee);
      expect(result).toBe("PITTSFORD, 3");
    });

    it("should handle case-insensitive Rochester city name", () => {
      const committee: CommitteeList = {
        id: 1,
        cityTown: "rochester", // lowercase
        legDistrict: 1,
        electionDistrict: 2,
      };

      const result = getCommitteeDisplayName(committee);
      expect(result).toBe("rochester, 2");
    });
  });

  describe("validateCommitteeSelection", () => {
    it("should return true for valid complete selection", () => {
      const selection: CommitteeSelection = {
        city: "BRIGHTON",
        legDistrict: "2",
        electionDistrict: 5,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(true);
    });

    it("should return true for valid selection without leg district", () => {
      const selection: CommitteeSelection = {
        city: "PITTSFORD",
        electionDistrict: 3,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(true);
    });

    it("should return true for valid selection with empty string leg district", () => {
      const selection: Partial<CommitteeSelection> = {
        city: "BRIGHTON",
        legDistrict: "",
        electionDistrict: 5,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(true);
    });

    it("should return false for selection missing city", () => {
      const selection: Partial<CommitteeSelection> = {
        legDistrict: "2",
        electionDistrict: 5,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(false);
    });

    it("should return false for selection missing election district", () => {
      const selection: Partial<CommitteeSelection> = {
        city: "BRIGHTON",
        legDistrict: "2",
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(false);
    });

    it("should return false for selection with empty city", () => {
      const selection: Partial<CommitteeSelection> = {
        city: "",
        legDistrict: "2",
        electionDistrict: 5,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(false);
    });

    it("should return false for selection with zero election district", () => {
      const selection: Partial<CommitteeSelection> = {
        city: "BRIGHTON",
        legDistrict: "2",
        electionDistrict: 0,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(false);
    });

    it("should return false for empty selection object", () => {
      const selection: Partial<CommitteeSelection> = {};

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(false);
    });

    it("should return false for selection with undefined values", () => {
      const selection: Partial<CommitteeSelection> = {
        city: undefined,
        legDistrict: undefined,
        electionDistrict: undefined,
      };

      const result = validateCommitteeSelection(selection);
      expect(result).toBe(false);
    });
  });

  describe("isCommitteeAtCapacity", () => {
    it("should return true when member count equals max members", () => {
      const result = isCommitteeAtCapacity(COMMITTEE_CONSTANTS.MAX_MEMBERS);
      expect(result).toBe(true);
    });

    it("should return true when member count exceeds max members", () => {
      const result = isCommitteeAtCapacity(COMMITTEE_CONSTANTS.MAX_MEMBERS + 1);
      expect(result).toBe(true);
    });

    it("should return false when member count is below max members", () => {
      const result = isCommitteeAtCapacity(COMMITTEE_CONSTANTS.MAX_MEMBERS - 1);
      expect(result).toBe(false);
    });

    it("should return false when member count is zero", () => {
      const result = isCommitteeAtCapacity(0);
      expect(result).toBe(false);
    });

    it("should handle negative member count", () => {
      const result = isCommitteeAtCapacity(-1);
      expect(result).toBe(false);
    });
  });

  describe("getAvailableSlots", () => {
    it("should return correct available slots when below capacity", () => {
      const memberCount = 2;
      const result = getAvailableSlots(memberCount);
      const expected = COMMITTEE_CONSTANTS.MAX_MEMBERS - memberCount;
      expect(result).toBe(expected);
    });

    it("should return zero when at capacity", () => {
      const result = getAvailableSlots(COMMITTEE_CONSTANTS.MAX_MEMBERS);
      expect(result).toBe(0);
    });

    it("should return zero when over capacity", () => {
      const result = getAvailableSlots(COMMITTEE_CONSTANTS.MAX_MEMBERS + 2);
      expect(result).toBe(0);
    });

    it("should return max members when member count is zero", () => {
      const result = getAvailableSlots(0);
      expect(result).toBe(COMMITTEE_CONSTANTS.MAX_MEMBERS);
    });

    it("should handle negative member count", () => {
      const result = getAvailableSlots(-1);
      expect(result).toBe(COMMITTEE_CONSTANTS.MAX_MEMBERS + 1);
    });
  });

  describe("formatLegislativeDistrict", () => {
    it("should return 'At-Large' for undefined leg district", () => {
      const result = formatLegislativeDistrict(undefined);
      expect(result).toBe("At-Large");
    });

    it("should return 'At-Large' for null leg district", () => {
      const result = formatLegislativeDistrict(null);
      expect(result).toBe("At-Large");
    });

    it("should return 'At-Large' for empty string leg district", () => {
      const result = formatLegislativeDistrict("");
      expect(result).toBe("At-Large");
    });

    it("should return 'At-Large' for LEG_DISTRICT_SENTINEL value", () => {
      const result = formatLegislativeDistrict(LEG_DISTRICT_SENTINEL);
      expect(result).toBe("At-Large");
    });

    it("should return 'At-Large' for LEG_DISTRICT_SENTINEL as string", () => {
      const result = formatLegislativeDistrict(
        LEG_DISTRICT_SENTINEL.toString(),
      );
      expect(result).toBe("-1");
    });

    it("should return string representation for valid numeric leg district", () => {
      const result = formatLegislativeDistrict(5);
      expect(result).toBe("5");
    });

    it("should return string representation for valid string leg district", () => {
      const result = formatLegislativeDistrict("3");
      expect(result).toBe("3");
    });

    it("should handle zero as valid leg district", () => {
      const result = formatLegislativeDistrict(0);
      expect(result).toBe("0");
    });

    it("should handle negative numbers as valid leg district", () => {
      const result = formatLegislativeDistrict(-2);
      expect(result).toBe("-2");
    });

    it("should handle decimal numbers", () => {
      const result = formatLegislativeDistrict(3.5);
      expect(result).toBe("3.5");
    });
  });

  describe("requiresLegislativeDistrict", () => {
    it("should return true for Rochester city (uppercase)", () => {
      const result = requiresLegislativeDistrict("ROCHESTER");
      expect(result).toBe(true);
    });

    it("should return true for Rochester city (lowercase)", () => {
      const result = requiresLegislativeDistrict("rochester");
      expect(result).toBe(true);
    });

    it("should return true for Rochester city (mixed case)", () => {
      const result = requiresLegislativeDistrict("Rochester");
      expect(result).toBe(true);
    });

    it("should return false for non-Rochester city", () => {
      const result = requiresLegislativeDistrict("BRIGHTON");
      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      const result = requiresLegislativeDistrict("");
      expect(result).toBe(false);
    });

    it("should return false for city with extra spaces", () => {
      const result = requiresLegislativeDistrict(" ROCHESTER ");
      expect(result).toBe(false);
    });

    it("should return false for partial match", () => {
      const result = requiresLegislativeDistrict("ROCHESTER_CITY");
      expect(result).toBe(false);
    });
  });
});
