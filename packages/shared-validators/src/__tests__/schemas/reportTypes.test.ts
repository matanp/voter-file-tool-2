import type { EnrichedReportData } from '../../schemas/report';

type AssertNotNever<T> = T extends never ? never : true;

type _VoterImportJob = AssertNotNever<
  Extract<EnrichedReportData, { type: 'voterImport' }>
>;
type _BoeFlaggingJob = AssertNotNever<
  Extract<EnrichedReportData, { type: 'boeEligibilityFlagging' }>
>;
type _XlsxReport = AssertNotNever<
  Extract<EnrichedReportData, { type: 'ldCommittees' | 'voterList' }>
>;

const _typeChecks: [_VoterImportJob, _BoeFlaggingJob, _XlsxReport] = [
  true,
  true,
  true,
];

describe('EnrichedReportData type exports', () => {
  it('preserves discriminated union branches at compile time', () => {
    expect(_typeChecks).toEqual([true, true, true]);
  });
});
