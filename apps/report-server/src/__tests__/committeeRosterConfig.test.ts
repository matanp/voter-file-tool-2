import type { EnrichedReportData } from '@voter-file-tool/shared-validators';
import { buildCommitteeRosterReportConfig } from '../committeeRosterConfig';

type RosterJob = Extract<EnrichedReportData, { type: 'committeeRoster' }>;

function rosterJob(overrides: Partial<RosterJob> = {}): RosterJob {
  return {
    type: 'committeeRoster',
    name: 'Roster',
    format: 'xlsx',
    scope: 'countywide',
    includeFields: [],
    xlsxConfig: { includeCompoundFields: { name: true, address: true } },
    reportAuthor: 'Author',
    jobId: 'job-1',
    ...overrides,
  };
}

const ROSTER_COLUMN_ORDER = [
  'electionDistrict',
  'name',
  'address',
  'mailingAddress',
  'telephone',
  'email',
];

describe('buildCommitteeRosterReportConfig', () => {
  it('gives ED, Name, Address for the default selection', () => {
    const { xlsx, pdfColumns } = buildCommitteeRosterReportConfig(rosterJob());

    expect(xlsx).toEqual({
      selectedFields: ['electionDistrict'],
      includeCompoundFields: {
        name: true,
        address: true,
        mailingAddress: false,
      },
      columnOrder: ROSTER_COLUMN_ORDER,
    });
    expect(pdfColumns).toEqual(['name', 'address']);
  });

  it('includes every column when everything is checked', () => {
    const { xlsx, pdfColumns } = buildCommitteeRosterReportConfig(
      rosterJob({
        includeFields: ['telephone', 'email'],
        xlsxConfig: {
          includeCompoundFields: {
            name: true,
            address: true,
            mailingAddress: true,
          },
        },
      }),
    );

    expect(xlsx.selectedFields).toEqual([
      'electionDistrict',
      'telephone',
      'email',
    ]);
    expect(xlsx.includeCompoundFields).toEqual({
      name: true,
      address: true,
      mailingAddress: true,
    });
    expect(pdfColumns).toEqual([
      'name',
      'address',
      'mailingAddress',
      'telephone',
      'email',
    ]);
  });

  it('treats a missing xlsxConfig as Name and Address only', () => {
    const { xlsx, pdfColumns } = buildCommitteeRosterReportConfig(
      rosterJob({ xlsxConfig: undefined }),
    );

    expect(xlsx.includeCompoundFields).toEqual({
      name: true,
      address: true,
      mailingAddress: false,
    });
    expect(xlsx.selectedFields).toEqual(['electionDistrict']);
    expect(pdfColumns).toEqual(['name', 'address']);
  });

  it('emits columns in the fixed order and dedupes out-of-order includeFields', () => {
    const { xlsx, pdfColumns } = buildCommitteeRosterReportConfig(
      rosterJob({ includeFields: ['email', 'telephone', 'email'] }),
    );

    expect(xlsx.selectedFields).toEqual([
      'electionDistrict',
      'telephone',
      'email',
    ]);
    expect(pdfColumns).toEqual(['name', 'address', 'telephone', 'email']);
  });

  it('ignores client name: false, columnOrder, and columnHeaders', () => {
    const { xlsx, pdfColumns } = buildCommitteeRosterReportConfig(
      rosterJob({
        xlsxConfig: {
          includeCompoundFields: { name: false, address: false },
          columnOrder: ['email', 'name'],
          columnHeaders: { name: 'Who' },
        },
      }),
    );

    expect(xlsx).toEqual({
      selectedFields: ['electionDistrict'],
      includeCompoundFields: {
        name: true,
        address: false,
        mailingAddress: false,
      },
      columnOrder: ROSTER_COLUMN_ORDER,
    });
    expect(xlsx.columnHeaders).toBeUndefined();
    expect(pdfColumns).toEqual(['name']);
  });
});
