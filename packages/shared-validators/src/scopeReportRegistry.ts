// Cross-package scope report metadata (API + report-server). No UI/routing fields.
import type { ReportType } from '@voter-file-tool/shared-prisma';

export type ScopeReportFormatDefinition =
  | { kind: 'fixed'; value: 'pdf' }
  | {
      kind: 'select';
      options: readonly ['pdf', 'xlsx'];
      default: 'pdf' | 'xlsx';
    };

export interface ScopeReportDefinition {
  jurisdictionLabel: string;
  prismaReportType: ReportType;
  filename: string;
  format: ScopeReportFormatDefinition;
  extraFields: readonly string[];
}

export const SCOPE_REPORT_REGISTRY = {
  committeeRoster: {
    jurisdictionLabel: 'committee rosters',
    prismaReportType: 'CommitteeReport',
    filename: 'committeeRoster',
    format: { kind: 'select', options: ['pdf', 'xlsx'], default: 'xlsx' },
    extraFields: [],
  },
  signInSheet: {
    jurisdictionLabel: 'sign-in sheets',
    prismaReportType: 'SignInSheet',
    filename: 'signInSheet',
    format: { kind: 'fixed', value: 'pdf' },
    extraFields: ['meetingDate'],
  },
  designationWeightSummary: {
    jurisdictionLabel: 'designation weight summaries',
    prismaReportType: 'DesignationWeightSummary',
    filename: 'designationWeightSummary',
    format: { kind: 'select', options: ['pdf', 'xlsx'], default: 'xlsx' },
    extraFields: [],
  },
  vacancyReport: {
    jurisdictionLabel: 'vacancy reports',
    prismaReportType: 'VacancyReport',
    filename: 'vacancyReport',
    format: { kind: 'select', options: ['pdf', 'xlsx'], default: 'xlsx' },
    extraFields: ['vacancyFilter'],
  },
  changesReport: {
    jurisdictionLabel: 'changes reports',
    prismaReportType: 'ChangesReport',
    filename: 'changesReport',
    format: { kind: 'select', options: ['pdf', 'xlsx'], default: 'xlsx' },
    extraFields: ['dateFrom', 'dateTo'],
  },
  petitionOutcomesReport: {
    jurisdictionLabel: 'petition outcomes reports',
    prismaReportType: 'PetitionOutcomesReport',
    filename: 'petitionOutcomesReport',
    format: { kind: 'select', options: ['pdf', 'xlsx'], default: 'xlsx' },
    extraFields: [],
  },
} as const satisfies Record<string, ScopeReportDefinition>;

export type ScopeReportType = keyof typeof SCOPE_REPORT_REGISTRY;

export const SCOPE_REPORT_TYPES = Object.keys(
  SCOPE_REPORT_REGISTRY,
) as ScopeReportType[] satisfies ScopeReportType[];

/** Human-readable label for jurisdiction access denial messages in generateReport. */
export function getScopeReportJurisdictionLabel(type: ScopeReportType): string {
  return SCOPE_REPORT_REGISTRY[type].jurisdictionLabel;
}

/** Build scope-report slice of REPORT_TYPE_MAPPINGS from the registry. */
export function getScopeReportTypeMappings(): Record<
  ScopeReportType,
  { databaseValue: ReportType; filename: string }
> {
  return Object.fromEntries(
    SCOPE_REPORT_TYPES.map((type) => [
      type,
      {
        databaseValue: SCOPE_REPORT_REGISTRY[type].prismaReportType,
        filename: SCOPE_REPORT_REGISTRY[type].filename,
      },
    ]),
  ) as Record<
    ScopeReportType,
    { databaseValue: ReportType; filename: string }
  >;
}
