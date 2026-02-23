/**
 * Unit tests for eligibilityService (SRS §2.2 — inactive voter / import version helpers).
 * See docs/SRS/SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md.
 */

import {
  getMostRecentImportVersion,
  isVoterPossiblyInactive,
} from "~/app/api/lib/eligibilityService";
import { prismaMock } from "../../../utils/mocks";

describe("eligibilityService", () => {
  describe("getMostRecentImportVersion", () => {
    it("returns null when no VoterRecord exists", async () => {
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await getMostRecentImportVersion(prismaMock as never);
      expect(result).toBeNull();
    });

    it("returns the voter version when one voter exists", async () => {
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      });
      const result = await getMostRecentImportVersion(prismaMock as never);
      expect(result).toEqual({ year: 2024, recordEntryNumber: 1 });
    });

    it("returns max (year, recordEntryNumber) when multiple voters exist", async () => {
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 3,
      });
      const result = await getMostRecentImportVersion(prismaMock as never);
      expect(result).toEqual({ year: 2024, recordEntryNumber: 3 });
    });
  });

  describe("isVoterPossiblyInactive", () => {
    const mostRecent = { year: 2024, recordEntryNumber: 2 };

    it("returns true when voter year is older", () => {
      expect(
        isVoterPossiblyInactive(
          { latestRecordEntryYear: 2023, latestRecordEntryNumber: 5 },
          mostRecent,
        ),
      ).toBe(true);
    });

    it("returns true when same year but lower recordEntryNumber", () => {
      expect(
        isVoterPossiblyInactive(
          { latestRecordEntryYear: 2024, latestRecordEntryNumber: 1 },
          mostRecent,
        ),
      ).toBe(true);
    });

    it("returns false when same version", () => {
      expect(
        isVoterPossiblyInactive(
          { latestRecordEntryYear: 2024, latestRecordEntryNumber: 2 },
          mostRecent,
        ),
      ).toBe(false);
    });

    it("returns false when voter version is newer", () => {
      expect(
        isVoterPossiblyInactive(
          { latestRecordEntryYear: 2024, latestRecordEntryNumber: 3 },
          mostRecent,
        ),
      ).toBe(false);
    });
  });
});
