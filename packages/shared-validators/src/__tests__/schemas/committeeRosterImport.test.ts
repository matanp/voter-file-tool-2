import {
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
