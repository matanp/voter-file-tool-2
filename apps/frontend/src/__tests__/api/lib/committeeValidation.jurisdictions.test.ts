/**
 * SRS 3.1 — Tests for getUserJurisdictions and committeeMatchesJurisdictions.
 */

import { PrivilegeLevel } from "@prisma/client";
import {
  getUserJurisdictions,
  committeeMatchesJurisdictions,
  buildJurisdictionWhere,
} from "~/app/api/lib/committeeValidation";
import { DEFAULT_ACTIVE_TERM_ID } from "../../utils/testUtils";
import { prismaMock } from "../../utils/mocks";

const mockUserJurisdiction = prismaMock.userJurisdiction as {
  findMany: jest.Mock;
};

describe("committeeValidation — jurisdictions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserJurisdictions", () => {
    it("returns null for Admin", async () => {
      const result = await getUserJurisdictions(
        "user-1",
        DEFAULT_ACTIVE_TERM_ID,
        PrivilegeLevel.Admin,
      );
      expect(result).toBeNull();
      expect(mockUserJurisdiction.findMany).not.toHaveBeenCalled();
    });

    it("returns null for Developer", async () => {
      const result = await getUserJurisdictions(
        "user-1",
        DEFAULT_ACTIVE_TERM_ID,
        PrivilegeLevel.Developer,
      );
      expect(result).toBeNull();
      expect(mockUserJurisdiction.findMany).not.toHaveBeenCalled();
    });

    it("returns jurisdictions for Leader", async () => {
      const jurisdictions = [
        {
          id: "j1",
          userId: "user-1",
          cityTown: "Rochester",
          legDistrict: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          createdAt: new Date(),
          createdById: "admin-1",
        },
      ];
      mockUserJurisdiction.findMany.mockResolvedValue(jurisdictions);

      const result = await getUserJurisdictions(
        "user-1",
        DEFAULT_ACTIVE_TERM_ID,
        PrivilegeLevel.Leader,
      );
      expect(result).toEqual(jurisdictions);
      expect(mockUserJurisdiction.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", termId: DEFAULT_ACTIVE_TERM_ID },
      });
    });

    it("returns empty array for Leader with no assignments", async () => {
      mockUserJurisdiction.findMany.mockResolvedValue([]);
      const result = await getUserJurisdictions(
        "user-1",
        DEFAULT_ACTIVE_TERM_ID,
        PrivilegeLevel.Leader,
      );
      expect(result).toEqual([]);
    });
  });

  describe("committeeMatchesJurisdictions", () => {
    it("returns true when city and legDistrict match", () => {
      const jurisdictions = [
        { cityTown: "Rochester", legDistrict: 1 } as const,
      ];
      expect(
        committeeMatchesJurisdictions("Rochester", 1, jurisdictions),
      ).toBe(true);
    });

    it("returns true when jurisdiction has null legDistrict (all districts)", () => {
      const jurisdictions = [
        { cityTown: "Rochester", legDistrict: null } as const,
      ];
      expect(
        committeeMatchesJurisdictions("Rochester", 1, jurisdictions),
      ).toBe(true);
      expect(
        committeeMatchesJurisdictions("Rochester", 2, jurisdictions),
      ).toBe(true);
    });

    it("returns false when city does not match", () => {
      const jurisdictions = [
        { cityTown: "Rochester", legDistrict: 1 } as const,
      ];
      expect(
        committeeMatchesJurisdictions("Buffalo", 1, jurisdictions),
      ).toBe(false);
    });

    it("returns false when legDistrict does not match and assignment is specific", () => {
      const jurisdictions = [
        { cityTown: "Rochester", legDistrict: 1 } as const,
      ];
      expect(
        committeeMatchesJurisdictions("Rochester", 2, jurisdictions),
      ).toBe(false);
    });
  });

  describe("buildJurisdictionWhere", () => {
    it("omits legDistrict for an all-districts entry (null) so it matches any LD in that town", () => {
      const where = buildJurisdictionWhere([
        { cityTown: "Rochester", legDistrict: null },
      ]);
      expect(where).toEqual({ OR: [{ cityTown: "Rochester" }] });
    });

    it("includes legDistrict for a specific-district entry so it matches only that LD", () => {
      const where = buildJurisdictionWhere([
        { cityTown: "Rochester", legDistrict: 1 },
      ]);
      expect(where).toEqual({
        OR: [{ cityTown: "Rochester", legDistrict: 1 }],
      });
    });

    it("ORs a mixed list of all-district and specific-district entries", () => {
      const where = buildJurisdictionWhere([
        { cityTown: "Rochester", legDistrict: 1 },
        { cityTown: "Brighton", legDistrict: null },
      ]);
      expect(where).toEqual({
        OR: [
          { cityTown: "Rochester", legDistrict: 1 },
          { cityTown: "Brighton" },
        ],
      });
    });

    it("yields an empty OR (matches nothing) for an empty list", () => {
      expect(buildJurisdictionWhere([])).toEqual({ OR: [] });
    });
  });
});
