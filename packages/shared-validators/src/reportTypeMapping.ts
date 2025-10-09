// packages/shared-validators/src/reportTypeMapping.ts
// Purpose: Centralized report type mappings to eliminate duplication across API and report server

import type { ReportType } from '@voter-file-tool/shared-prisma';

/**
 * Centralized mapping of report types to their various representations
 * Eliminates duplication between API route and report server
 */
export const REPORT_TYPE_MAPPINGS = {
  ldCommittees: {
    databaseValue: 'CommitteeReport' as ReportType,
    filename: 'committeeReport',
  },
  voterList: {
    databaseValue: 'VoterList' as ReportType,
    filename: 'voterList',
  },
  absenteeReport: {
    databaseValue: 'AbsenteeReport' as ReportType,
    filename: 'absenteeReport',
  },
  designatedPetition: {
    databaseValue: 'DesignatedPetition' as ReportType,
    filename: 'designatedPetition',
  },
} as const;

export type ReportTypeKey = keyof typeof REPORT_TYPE_MAPPINGS;

/**
 * Maps report type to database enum value with exhaustive type checking
 * @param type - The report type from the API
 * @returns Corresponding database ReportType enum value
 */
export function getPrismaReportType(type: ReportTypeKey): ReportType {
  return REPORT_TYPE_MAPPINGS[type].databaseValue;
}

/**
 * Maps report type to filename component
 * @param type - The report type from the API
 * @returns Filename-safe string for the report type
 */
export function getFilenameReportType(type: ReportTypeKey): string {
  return REPORT_TYPE_MAPPINGS[type].filename;
}

/**
 * Validates that a report type is known and throws if not
 * @param type - The report type to validate
 * @returns The validated report type key
 * @throws Error if the report type is unknown
 */
export function validateReportType(type: string): ReportTypeKey {
  if (Object.prototype.hasOwnProperty.call(REPORT_TYPE_MAPPINGS, type)) {
    return type as ReportTypeKey;
  }

  const validTypes = Object.keys(REPORT_TYPE_MAPPINGS).join(', ');
  throw new Error(`Unknown report type: ${type}. Valid types: ${validTypes}`);
}
