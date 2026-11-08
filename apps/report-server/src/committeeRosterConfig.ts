import type {
  EnrichedReportData,
  VoterRecordField,
} from '@voter-file-tool/shared-validators';
import type { XLSXGenerationConfig } from './xlsxGenerator';

/** Columns a Committee Roster can show after the always-present ED column, in output order. */
export type CommitteeRosterColumn =
  | 'name'
  | 'address'
  | 'mailingAddress'
  | 'telephone'
  | 'email';

/** Fixed output order of the roster columns after ED. */
export const COMMITTEE_ROSTER_COLUMN_ORDER: readonly CommitteeRosterColumn[] = [
  'name',
  'address',
  'mailingAddress',
  'telephone',
  'email',
];

/**
 * Builds the XLSX config and PDF column list for a Committee Roster from the
 * job's picked fields. The client only chooses which columns are on: Name and
 * ED are always included, column order is fixed, and any client columnOrder /
 * columnHeaders are ignored.
 */
export function buildCommitteeRosterReportConfig(
  jobData: Extract<EnrichedReportData, { type: 'committeeRoster' }>,
): { xlsx: XLSXGenerationConfig; pdfColumns: CommitteeRosterColumn[] } {
  const compound = jobData.xlsxConfig?.includeCompoundFields ?? {
    name: true,
    address: true,
    mailingAddress: false,
  };
  const picked = new Set<string>(jobData.includeFields ?? []);

  const enabled: Record<CommitteeRosterColumn, boolean> = {
    name: true,
    address: compound.address === true,
    mailingAddress: compound.mailingAddress === true,
    telephone: picked.has('telephone'),
    email: picked.has('email'),
  };

  const pdfColumns = COMMITTEE_ROSTER_COLUMN_ORDER.filter((column) => enabled[column]);
  const plainFields = pdfColumns.filter(
    (column): column is 'telephone' | 'email' =>
      column === 'telephone' || column === 'email',
  );

  const selectedFields: VoterRecordField[] = ['electionDistrict', ...plainFields];

  return {
    xlsx: {
      selectedFields,
      includeCompoundFields: {
        name: true,
        address: enabled.address,
        mailingAddress: enabled.mailingAddress,
      },
      columnOrder: ['electionDistrict', ...COMMITTEE_ROSTER_COLUMN_ORDER],
    },
    pdfColumns,
  };
}
