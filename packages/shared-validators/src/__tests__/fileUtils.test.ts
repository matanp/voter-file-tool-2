import {
  sanitizeForS3Key,
  getUserDisplayName,
  generateReportFilename,
} from '../fileUtils';

describe('sanitizeForS3Key', () => {
  it('replaces slashes and spaces with hyphens', () => {
    expect(sanitizeForS3Key('path/to file', false)).toBe('path-to-file');
  });

  it('converts to lowercase', () => {
    expect(sanitizeForS3Key('UpperCase', false)).toBe('uppercase');
  });

  it('strips non-alphanumeric except hyphens and underscores', () => {
    expect(sanitizeForS3Key('a#b!c d', false)).toBe('abc-d');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeForS3Key('a---b', false)).toBe('a-b');
  });

  it('removes leading and trailing hyphens', () => {
    expect(sanitizeForS3Key('-middle-', false)).toBe('middle');
  });

  it('extracts username from email before sanitizing', () => {
    expect(sanitizeForS3Key('user.name@example.com', false)).toBe('username');
  });

  it('returns empty string for empty input when fallbackToUUID is false', () => {
    expect(sanitizeForS3Key('', false)).toBe('');
  });

  it('returns UUID-like string for empty input when fallbackToUUID is true', () => {
    const result = sanitizeForS3Key('', true);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
  });

  it('respects maxLen', () => {
    const long = 'a'.repeat(1000);
    expect(sanitizeForS3Key(long, false, 10).length).toBeLessThanOrEqual(10);
  });

  it('handles unicode by stripping non-ASCII', () => {
    const result = sanitizeForS3Key('café résumé', false);
    expect(result).not.toContain('é');
  });

  it('returns empty string for special-chars-only input when fallbackToUUID is false', () => {
    expect(sanitizeForS3Key('###!!!', false)).toBe('');
  });

  it('returns UUID for special-chars-only input when fallbackToUUID is true', () => {
    const result = sanitizeForS3Key('###!!!', true);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
  });

  it('handles backslash replacement', () => {
    expect(sanitizeForS3Key('path\\to\\file', false)).toBe('path-to-file');
  });

  it('handles non-string input with fallbackToUUID false', () => {
    expect(sanitizeForS3Key(null as unknown as string, false)).toBe('');
    expect(sanitizeForS3Key(undefined as unknown as string, false)).toBe('');
  });

  it('handles non-string input with fallbackToUUID true', () => {
    const result = sanitizeForS3Key(null as unknown as string, true);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getUserDisplayName', () => {
  const testId = '12345678-abcd-0000-0000-000000000001';

  it('uses name when available', () => {
    const result = getUserDisplayName(testId, 'John Doe');
    expect(result).toBe('john-doe-00000001');
  });

  it('uses email username when name is not available', () => {
    const result = getUserDisplayName(testId, undefined, 'jane@example.com');
    expect(result).toBe('jane-00000001');
  });

  it('prefers name over email when both provided', () => {
    const result = getUserDisplayName(testId, 'Alice', 'alice@example.com');
    expect(result).toMatch(/^alice-/);
  });

  it('uses id when neither name nor email provided', () => {
    const result = getUserDisplayName(testId);
    expect(result).toContain('00000001');
  });

  it('handles empty name with email', () => {
    const result = getUserDisplayName(testId, '  ', 'user@domain.com');
    expect(result).toBe('user-00000001');
  });

  it('falls back to unidentified-user when name/email sanitize to empty', () => {
    const result = getUserDisplayName(testId, '@@@', undefined);
    expect(result).toMatch(/unidentified-user.*00000001/);
  });

  it('handles null name with email', () => {
    const result = getUserDisplayName(testId, null, 'user@domain.com');
    expect(result).toBe('user-00000001');
  });

  it('handles empty string email', () => {
    const result = getUserDisplayName(testId, undefined, '');
    expect(result).toContain('00000001');
  });
});

describe('generateReportFilename', () => {
  it('produces correct format: author/type/name?timestamp.format', () => {
    const result = generateReportFilename(
      'My Report',
      'ldCommittees',
      'pdf',
      'john@example.com',
    );
    expect(result).toMatch(
      /^john\/committeeReport\/my-report-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it('works for all report types', () => {
    const types = [
      'ldCommittees',
      'voterList',
      'absenteeReport',
      'designatedPetition',
      'voterImport',
    ];
    types.forEach((type) => {
      const result = generateReportFilename(undefined, type, 'xlsx', 'author');
      expect(result).toContain('/');
      expect(result).toMatch(/\.xlsx$/);
    });
  });

  it('omits name part when reportName is undefined', () => {
    const result = generateReportFilename(
      undefined,
      'voterList',
      'xlsx',
      'author',
    );
    expect(result).toMatch(
      /^author\/voterList\/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xlsx$/,
    );
  });

  it('throws for invalid report type', () => {
    expect(() =>
      generateReportFilename('report', 'invalidType', 'pdf', 'author'),
    ).toThrow(/Unknown report type/);
  });
});
