import {
  REPORT_TYPE_MAPPINGS,
  validateReportType,
  getPrismaReportType,
  getFilenameReportType,
} from '../reportTypeMapping';
import { ReportType } from '@voter-file-tool/shared-prisma';

describe('REPORT_TYPE_MAPPINGS', () => {
  it('every key has databaseValue and filename', () => {
    const keys = Object.keys(REPORT_TYPE_MAPPINGS) as Array<
      keyof typeof REPORT_TYPE_MAPPINGS
    >;
    keys.forEach((key) => {
      const mapping = REPORT_TYPE_MAPPINGS[key];
      expect(mapping).toHaveProperty('databaseValue');
      expect(mapping).toHaveProperty('filename');
      expect(typeof mapping.databaseValue).toBe('string');
      expect(typeof mapping.filename).toBe('string');
    });
  });

  it('databaseValue matches Prisma ReportType enum', () => {
    const validReportTypes: ReportType[] = [
      'CommitteeReport',
      'VoterList',
      'AbsenteeReport',
      'DesignatedPetition',
      'VoterImport',
      'SignInSheet',
      'DesignationWeightSummary',
      'VacancyReport',
      'ChangesReport',
      'PetitionOutcomesReport',
    ];
    Object.values(REPORT_TYPE_MAPPINGS).forEach((mapping) => {
      expect(validReportTypes).toContain(mapping.databaseValue);
    });
  });
});

describe('validateReportType', () => {
  it('returns type for each valid key', () => {
    const keys = Object.keys(REPORT_TYPE_MAPPINGS) as Array<
      keyof typeof REPORT_TYPE_MAPPINGS
    >;
    keys.forEach((key) => {
      expect(validateReportType(key)).toBe(key);
    });
  });

  it('throws for invalid type with message listing valid types', () => {
    expect(() => validateReportType('unknown')).toThrow(/Unknown report type/);
    expect(() => validateReportType('unknown')).toThrow(/Valid types/);
  });
});

describe('getPrismaReportType', () => {
  it('returns correct mapping for each type', () => {
    expect(getPrismaReportType('ldCommittees')).toBe('CommitteeReport');
    expect(getPrismaReportType('voterList')).toBe('VoterList');
    expect(getPrismaReportType('absenteeReport')).toBe('AbsenteeReport');
    expect(getPrismaReportType('designatedPetition')).toBe(
      'DesignatedPetition',
    );
    expect(getPrismaReportType('voterImport')).toBe('VoterImport');
    expect(getPrismaReportType('signInSheet')).toBe('SignInSheet');
    expect(getPrismaReportType('designationWeightSummary')).toBe(
      'DesignationWeightSummary',
    );
    expect(getPrismaReportType('vacancyReport')).toBe('VacancyReport');
    expect(getPrismaReportType('changesReport')).toBe('ChangesReport');
    expect(getPrismaReportType('petitionOutcomesReport')).toBe(
      'PetitionOutcomesReport',
    );
  });
});

describe('getFilenameReportType', () => {
  it('returns correct filename for each type', () => {
    expect(getFilenameReportType('ldCommittees')).toBe('committeeReport');
    expect(getFilenameReportType('voterList')).toBe('voterList');
    expect(getFilenameReportType('absenteeReport')).toBe('absenteeReport');
    expect(getFilenameReportType('designatedPetition')).toBe(
      'designatedPetition',
    );
    expect(getFilenameReportType('voterImport')).toBe('voterImport');
    expect(getFilenameReportType('signInSheet')).toBe('signInSheet');
    expect(getFilenameReportType('designationWeightSummary')).toBe(
      'designationWeightSummary',
    );
    expect(getFilenameReportType('vacancyReport')).toBe('vacancyReport');
    expect(getFilenameReportType('changesReport')).toBe('changesReport');
    expect(getFilenameReportType('petitionOutcomesReport')).toBe(
      'petitionOutcomesReport',
    );
  });
});
