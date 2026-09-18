import {
  appliedSummarySchema,
  bulkLoadCommitteesSchema,
  ROSTER_FORMAT_IDS,
} from '../../schemas/committeeRosterImport';

const validPayload = {
  format: 'boe-elected-list',
  fileName: 'Elected County Committee List.csv',
  dryRun: false,
};

describe('bulkLoadCommitteesSchema', () => {
  it('accepts a format, a file name and an explicit dryRun', () => {
    expect(bulkLoadCommitteesSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('defaults dryRun to true when it is omitted', () => {
    expect(
      bulkLoadCommitteesSchema.parse({
        format: validPayload.format,
        fileName: validPayload.fileName,
      }).dryRun,
    ).toBe(true);
  });

  it('rejects a format it does not know', () => {
    expect(
      bulkLoadCommitteesSchema.safeParse({
        ...validPayload,
        format: 'democratic-committee-export',
      }).success,
    ).toBe(false);
  });

  it('rejects an empty file name', () => {
    expect(
      bulkLoadCommitteesSchema.safeParse({ ...validPayload, fileName: '   ' })
        .success,
    ).toBe(false);
  });

  it('accepts every registered roster format identifier', () => {
    for (const format of ROSTER_FORMAT_IDS) {
      expect(
        bulkLoadCommitteesSchema.safeParse({ ...validPayload, format }).success,
      ).toBe(true);
    }
  });
});

describe('appliedSummarySchema', () => {
  const committee = {
    cityTown: 'ROCHESTER',
    legDistrict: 1,
    electionDistrict: 1,
    termId: 'term-1',
  };
  const summary = {
    counts: {
      activations: 1,
      removals: 0,
      discrepancies: 1,
      skippedActivations: 1,
    },
    activations: [
      {
        voterRecordId: 'V1',
        committee,
        membershipType: 'PETITIONED',
        seatNumber: 1,
      },
    ],
    removals: [],
    skippedActivations: [
      {
        voterRecordId: 'V2',
        committee,
        membershipType: 'PETITIONED',
        reason: 'active-elsewhere',
      },
    ],
  };

  it('accepts a summary of completed writes and skipped activations', () => {
    expect(appliedSummarySchema.parse(summary)).toEqual(summary);
  });

  it('is strict: an unnamed field fails the parse', () => {
    expect(
      appliedSummarySchema.safeParse({ ...summary, wasApplied: true }).success,
    ).toBe(false);
  });

  it('rejects a skip reason it does not know', () => {
    expect(
      appliedSummarySchema.safeParse({
        ...summary,
        skippedActivations: [
          { ...summary.skippedActivations[0], reason: 'capacity' },
        ],
      }).success,
    ).toBe(false);
  });
});
