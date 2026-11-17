import { REPORT_AUTHOR, voterRecordOf } from './fixtures/shared';
import type { CommitteeSpec, FixtureInput } from './fixtures/types';

/**
 * MIRROR of processJob in apps/report-server/src/index.ts. The harness can't import processJob
 * (it fetches from the database and sends callbacks), so this table repeats, per job type,
 * which deployed generator runs, with which arguments, and how generatePDFAndUpload is called.
 * It is outside what the harness validates and can drift from index.ts: change it whenever
 * those call sites change. Every run's summary repeats this caveat.
 */

/** The deployed modules the worker loads from apps/report-server/dist. Typed loosely: they are runtime JS. */
export type DeployedModules = {
  utils: {
    generateHTML: (...args: unknown[]) => string;
    generateCommitteeReportHTML: (...args: unknown[]) => string;
    generateSignInSheetHTML: (...args: unknown[]) => string;
    generateDesignationWeightSummaryHTML: (...args: unknown[]) => string;
    generateVacancyReportHTML: (...args: unknown[]) => string;
    generateChangesReportHTML: (...args: unknown[]) => string;
    generatePetitionOutcomesReportHTML: (...args: unknown[]) => string;
    generatePDFAndUpload: (html: string, useLandscape: boolean, fileName: string, overrides?: { format?: 'Letter' | 'Legal'; landscape?: boolean }) => Promise<void>;
  };
  committeeMappingHelpers: { mapCommitteesToReportShape: (committees: unknown[]) => unknown[] };
  committeeRosterConfig: { buildCommitteeRosterReportConfig: (jobData: unknown) => { pdfColumns: unknown } };
  signInSheetHelpers: {
    resolveSignInSheetTitleScope: (args: { scope: string; cityTown?: string; legDistrict?: number }) => Record<string, unknown>;
    formatContactInfoDate: (latest: Date | null, now: Date) => string;
  };
};

export type PdfCall = {
  html: string;
  useLandscape: boolean;
  overrides?: { format?: 'Letter' | 'Legal'; landscape?: boolean };
};

/** The committee rows fetch*Data would return: committees with memberships and voter records. */
function committeeRows(committees: CommitteeSpec[]) {
  return committees.map((c) => ({
    cityTown: c.cityTown,
    legDistrict: c.legDistrict,
    electionDistrict: c.electionDistrict,
    memberships: c.members.map((m) => ({ submissionMetadata: null, voterRecord: voterRecordOf(m) })),
  }));
}

/**
 * Builds the HTML and print options for one fixture, as processJob would for a job of the
 * same type. Call it with the clock frozen: generators read `new Date()`.
 */
export function buildPdfCall(input: FixtureInput, d: DeployedModules): PdfCall {
  switch (input.jobType) {
    case 'ldCommittees':
    case 'committeeRoster': {
      const payload = d.committeeMappingHelpers.mapCommitteesToReportShape(committeeRows(input.committees));
      const rosterConfig =
        input.jobType === 'committeeRoster'
          ? d.committeeRosterConfig.buildCommitteeRosterReportConfig({
              type: 'committeeRoster',
              includeFields: input.includeFields,
              xlsxConfig: { includeCompoundFields: input.includeCompoundFields },
            })
          : undefined;
      return { html: d.utils.generateCommitteeReportHTML(payload, rosterConfig?.pdfColumns), useLandscape: true };
    }
    case 'designatedPetition':
      return {
        html: d.utils.generateHTML(input.candidates, input.vacancyAppointments, input.party, input.electionDate, input.numPages),
        useLandscape: false,
      };
    case 'signInSheet': {
      const contactInfoDate = d.signInSheetHelpers.formatContactInfoDate(
        input.latestImportCompletedAt ? new Date(input.latestImportCompletedAt) : null,
        new Date(),
      );
      const html = d.utils.generateSignInSheetHTML(committeeRows(input.committees), {
        ...d.signInSheetHelpers.resolveSignInSheetTitleScope({ scope: input.scope, cityTown: input.cityTown, legDistrict: input.legDistrict }),
        meetingName: input.meetingName,
        meetingDate: input.meetingDate,
        contactInfoDate,
      });
      return { html, useLandscape: false, overrides: { format: 'Legal', landscape: true } };
    }
    case 'designationWeightSummary': {
      const { scope, cityTown, legDistrict } = input;
      const scopeDescription =
        scope === 'countywide'
          ? 'Countywide'
          : cityTown === 'ROCHESTER' && legDistrict != null
            ? `${cityTown} LD ${legDistrict.toString().padStart(2, '0')}`
            : (cityTown ?? 'Jurisdiction');
      const summaries = input.summaries.map((s, i) => ({
        committeeListId: i + 1,
        ...s,
        totalContributingSeats: s.seats.filter((x) => x.isPetitioned && x.seatWeight != null).length,
        seats: s.seats.map((x) => ({ ...x, contributes: x.isPetitioned && x.seatWeight != null, contributionWeight: x.seatWeight ?? 0 })),
      }));
      return {
        html: d.utils.generateDesignationWeightSummaryHTML(summaries, scopeDescription, REPORT_AUTHOR),
        useLandscape: true,
        overrides: { format: 'Letter', landscape: true },
      };
    }
    case 'vacancyReport':
      return { html: d.utils.generateVacancyReportHTML(input.rows, REPORT_AUTHOR), useLandscape: true };
    case 'changesReport':
      return { html: d.utils.generateChangesReportHTML(input.rows, input.dateFrom, input.dateTo, REPORT_AUTHOR), useLandscape: true };
    case 'petitionOutcomesReport':
      return { html: d.utils.generatePetitionOutcomesReportHTML(input.rows, REPORT_AUTHOR), useLandscape: true };
  }
}
