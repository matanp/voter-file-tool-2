import {
  SCOPE_REPORT_REGISTRY,
  SCOPE_REPORT_TYPES,
  getScopeReportJurisdictionLabel,
  getScopeReportTypeMappings,
  type ScopeReportType,
} from '../scopeReportRegistry';
import { REPORT_TYPE_MAPPINGS } from '../reportTypeMapping';

describe('SCOPE_REPORT_REGISTRY', () => {
  it('has an entry for every ScopeReportType', () => {
    const registryKeys = Object.keys(SCOPE_REPORT_REGISTRY) as ScopeReportType[];
    expect(registryKeys.sort()).toEqual([...SCOPE_REPORT_TYPES].sort());
  });

  it('derives jurisdiction labels used by generateReport', () => {
    expect(getScopeReportJurisdictionLabel('committeeRoster')).toBe(
      'committee rosters',
    );
    expect(getScopeReportJurisdictionLabel('signInSheet')).toBe(
      'sign-in sheets',
    );
    expect(getScopeReportJurisdictionLabel('vacancyReport')).toBe(
      'vacancy reports',
    );
  });

  it('aligns scope mappings with REPORT_TYPE_MAPPINGS', () => {
    const scopeMappings = getScopeReportTypeMappings();
    for (const type of SCOPE_REPORT_TYPES) {
      expect(REPORT_TYPE_MAPPINGS[type]).toEqual(scopeMappings[type]);
    }
  });

  it('keeps non-scope report mappings explicit', () => {
    expect(REPORT_TYPE_MAPPINGS.ldCommittees.filename).toBe('committeeReport');
    expect(REPORT_TYPE_MAPPINGS.voterList.filename).toBe('voterList');
  });
});
