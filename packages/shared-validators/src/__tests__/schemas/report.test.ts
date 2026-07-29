import {
  generateReportSchema,
  enrichedReportDataSchema,
  isScopedReportData,
} from '../../schemas/report';

describe('generateReportSchema - signInSheet', () => {
  it('parses valid signInSheet payload with countywide scope', () => {
    const valid = {
      type: 'signInSheet',
      name: 'Sign-In Sheet - 2025-03',
      format: 'pdf',
      scope: 'countywide',
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'signInSheet',
      scope: 'countywide',
      name: 'Sign-In Sheet - 2025-03',
    });
  });

  it('parses valid signInSheet payload with jurisdiction scope and cityTown', () => {
    const valid = {
      type: 'signInSheet',
      name: 'Rochester LD 01',
      format: 'pdf',
      scope: 'jurisdiction',
      cityTown: 'ROCHESTER',
      legDistrict: 1,
      meetingDate: '2025-03-15',
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'signInSheet',
      scope: 'jurisdiction',
      cityTown: 'ROCHESTER',
      legDistrict: 1,
      meetingDate: '2025-03-15',
    });
  });

  it('rejects signInSheet with invalid format', () => {
    const invalid = {
      type: 'signInSheet',
      name: 'Test',
      format: 'xlsx',
      scope: 'countywide',
    };

    expect(() => generateReportSchema.parse(invalid)).toThrow();
  });

  it('rejects signInSheet with invalid scope', () => {
    const invalid = {
      type: 'signInSheet',
      name: 'Test',
      format: 'pdf',
      scope: 'invalid',
    };

    expect(() => generateReportSchema.parse(invalid)).toThrow();
  });
});

describe('generateReportSchema - committeeRoster', () => {
  it('parses valid committeeRoster payload with countywide scope', () => {
    const valid = {
      type: 'committeeRoster',
      name: 'Committee Roster - 2026-02',
      format: 'xlsx',
      scope: 'countywide',
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'committeeRoster',
      scope: 'countywide',
      format: 'xlsx',
      name: 'Committee Roster - 2026-02',
    });
  });

  it('parses valid committeeRoster payload with jurisdiction scope', () => {
    const valid = {
      type: 'committeeRoster',
      name: 'Rochester Committee Roster',
      format: 'pdf',
      scope: 'jurisdiction',
      cityTown: 'ROCHESTER',
      legDistrict: 1,
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'committeeRoster',
      scope: 'jurisdiction',
      cityTown: 'ROCHESTER',
      legDistrict: 1,
    });
  });
});

describe('enrichedReportDataSchema - signInSheet', () => {
  it('parses enriched signInSheet payload', () => {
    const valid = {
      type: 'signInSheet',
      name: 'Sign-In Sheet',
      format: 'pdf',
      scope: 'countywide',
      reportAuthor: 'Jane Doe',
      jobId: 'clxyz123456789012345678901',
    };

    const result = enrichedReportDataSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'signInSheet',
      reportAuthor: 'Jane Doe',
      jobId: 'clxyz123456789012345678901',
    });
  });
});

describe('generateReportSchema - designationWeightSummary', () => {
  it('parses valid designationWeightSummary payload with countywide scope', () => {
    const valid = {
      type: 'designationWeightSummary',
      name: 'Weight Summary - 2025-03',
      format: 'xlsx',
      scope: 'countywide',
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'designationWeightSummary',
      scope: 'countywide',
      format: 'xlsx',
    });
  });

  it('parses valid designationWeightSummary payload with jurisdiction scope', () => {
    const valid = {
      type: 'designationWeightSummary',
      name: 'Weight Summary - Rochester',
      format: 'pdf',
      scope: 'jurisdiction',
      cityTown: 'ROCHESTER',
      legDistrict: 1,
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'designationWeightSummary',
      scope: 'jurisdiction',
      cityTown: 'ROCHESTER',
      legDistrict: 1,
    });
  });

  it('rejects designationWeightSummary with invalid format', () => {
    const invalid = {
      type: 'designationWeightSummary',
      name: 'Test',
      format: 'txt',
      scope: 'countywide',
    };

    expect(() => generateReportSchema.parse(invalid)).toThrow();
  });
});

describe('generateReportSchema - changesReport', () => {
  it('parses valid changesReport payload with ISO date format', () => {
    const valid = {
      type: 'changesReport',
      name: 'Changes - Jan 2025',
      format: 'pdf',
      scope: 'countywide',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    };

    const result = generateReportSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'changesReport',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });
  });

  it('rejects changesReport with invalid date format', () => {
    const invalid = {
      type: 'changesReport',
      name: 'Test',
      format: 'pdf',
      scope: 'countywide',
      dateFrom: '01/15/2025',
      dateTo: '2025-12-31',
    };

    expect(() => generateReportSchema.parse(invalid)).toThrow(/Expected ISO date YYYY-MM-DD/);
  });
});

describe('generateReportSchema - scope jurisdiction validation', () => {
  it('rejects jurisdiction scope without cityTown for signInSheet', () => {
    const invalid = {
      type: 'signInSheet',
      name: 'Test',
      format: 'pdf',
      scope: 'jurisdiction',
    };

    expect(() => generateReportSchema.parse(invalid)).toThrow(/cityTown is required/);
  });

  it('rejects jurisdiction scope with empty cityTown for vacancyReport', () => {
    const invalid = {
      type: 'vacancyReport',
      name: 'Test',
      format: 'pdf',
      scope: 'jurisdiction',
      cityTown: '   ',
    };

    expect(() => generateReportSchema.parse(invalid)).toThrow(/cityTown is required/);
  });
});

describe('enrichedReportDataSchema', () => {
  it('enriches generateReport variants with reportAuthor and jobId', () => {
    const valid = {
      type: 'signInSheet',
      name: 'Test',
      format: 'pdf',
      scope: 'countywide',
      reportAuthor: 'Jane Doe',
      jobId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    };

    const result = enrichedReportDataSchema.parse(valid);
    expect(result).toMatchObject({
      type: 'signInSheet',
      reportAuthor: 'Jane Doe',
      jobId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    });
  });
});

describe('isScopedReportData', () => {
  it.each([
    ['committeeRoster', { type: 'committeeRoster', name: 'Test', format: 'pdf', scope: 'countywide' }],
    ['signInSheet', { type: 'signInSheet', name: 'Test', format: 'pdf', scope: 'countywide' }],
    ['designationWeightSummary', { type: 'designationWeightSummary', name: 'Test', format: 'pdf', scope: 'countywide' }],
    ['vacancyReport', { type: 'vacancyReport', name: 'Test', format: 'pdf', scope: 'countywide' }],
    ['changesReport', { type: 'changesReport', name: 'Test', format: 'pdf', scope: 'countywide', dateFrom: '2025-01-01', dateTo: '2025-12-31' }],
    ['petitionOutcomesReport', { type: 'petitionOutcomesReport', name: 'Test', format: 'pdf', scope: 'countywide' }],
  ] as const)('returns true for %s', (_label, raw) => {
    const data = generateReportSchema.parse(raw);
    expect(isScopedReportData(data)).toBe(true);
  });

  it.each([
    ['ldCommittees', { type: 'ldCommittees', format: 'pdf' }],
    ['voterList', { type: 'voterList', format: 'xlsx', searchQuery: [], includeFields: [] }],
  ] as const)('returns false for %s', (_label, raw) => {
    const data = generateReportSchema.parse(raw);
    expect(isScopedReportData(data)).toBe(false);
  });
});
