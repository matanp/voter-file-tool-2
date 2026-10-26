/**
 * Unit tests for the inactive-voter / import-version helpers (SRS §2.2).
 * See docs/SRS/SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md.
 */
import type { PrismaClient, VoterRecord } from '@prisma/client';
import {
  getMostRecentImportVersion,
  isVoterPossiblyInactive,
} from '../boeEligibilityFlagging';

// The row getMostRecentImportVersion selects.
type ImportVersionRow = Pick<
  VoterRecord,
  'latestRecordEntryYear' | 'latestRecordEntryNumber'
>;

function createDbMock(latest: ImportVersionRow | null) {
  const db = {
    voterRecord: {
      findFirst: jest
        .fn<Promise<ImportVersionRow | null>, []>()
        .mockResolvedValue(latest),
    },
  };
  // getMostRecentImportVersion only touches voterRecord.findFirst; the cast stops at this helper.
  return db as unknown as PrismaClient;
}

describe('getMostRecentImportVersion', () => {
  it('returns null when no VoterRecord exists', async () => {
    const result = await getMostRecentImportVersion(createDbMock(null));
    expect(result).toBeNull();
  });

  it('returns the voter version when one voter exists', async () => {
    const result = await getMostRecentImportVersion(
      createDbMock({ latestRecordEntryYear: 2024, latestRecordEntryNumber: 1 }),
    );
    expect(result).toEqual({ year: 2024, recordEntryNumber: 1 });
  });

  it('returns max (year, recordEntryNumber) when multiple voters exist', async () => {
    const result = await getMostRecentImportVersion(
      createDbMock({ latestRecordEntryYear: 2024, latestRecordEntryNumber: 3 }),
    );
    expect(result).toEqual({ year: 2024, recordEntryNumber: 3 });
  });
});

describe('isVoterPossiblyInactive', () => {
  const mostRecent = { year: 2024, recordEntryNumber: 2 };

  it('returns true when voter year is older', () => {
    expect(
      isVoterPossiblyInactive(
        { latestRecordEntryYear: 2023, latestRecordEntryNumber: 5 },
        mostRecent,
      ),
    ).toBe(true);
  });

  it('returns true when same year but lower recordEntryNumber', () => {
    expect(
      isVoterPossiblyInactive(
        { latestRecordEntryYear: 2024, latestRecordEntryNumber: 1 },
        mostRecent,
      ),
    ).toBe(true);
  });

  it('returns false when same version', () => {
    expect(
      isVoterPossiblyInactive(
        { latestRecordEntryYear: 2024, latestRecordEntryNumber: 2 },
        mostRecent,
      ),
    ).toBe(false);
  });

  it('returns false when voter version is newer', () => {
    expect(
      isVoterPossiblyInactive(
        { latestRecordEntryYear: 2024, latestRecordEntryNumber: 3 },
        mostRecent,
      ),
    ).toBe(false);
  });
});
