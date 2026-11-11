import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import CommitteeReport from './components/CommitteeReport';
import puppeteer, { type Browser } from 'puppeteer';
import { uploadFileToR2 } from './s3Utils';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import {
  createCompoundNameField,
  createCompoundAddressField,
  createCompoundMailingAddressField,
  type EnrichedPartialVoterRecordAPI,
} from '@voter-file-tool/shared-validators';
import type {
  CommitteeReportStructure,
  CommitteeWithMembers,
} from './committeeMappingHelpers';
import type { CommitteeMember } from './components/CommitteeReport';
import type { CommitteeRosterColumn } from './committeeRosterConfig';
import SignInSheet from './components/SignInSheet';
import {
  buildSignInSheets,
  type SignInSheetCommitteeInput,
  type SignInSheetTitleScope,
} from './signInSheetHelpers';
import DesignationWeightSummaryReport, {
  groupWeightSummaries,
} from './components/DesignationWeightSummary';
import VacancyReport from './components/VacancyReport';
import ChangesReport from './components/ChangesReport';
import PetitionOutcomesReport from './components/PetitionOutcomesReport';
import type {
  DesignationWeightSummary,
  VacancyReportRow,
  ChangesReportRow,
  PetitionOutcomeRow,
} from './committeeMappingHelpers';
// Helper function to convert YYYY-MM-DD format to "Month Day, Year" format
function formatElectionDateForPetition(dateString: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    // Use UTC methods to preserve the intended date
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Get ordinal suffix for day
    const getOrdinal = (day: number): string => {
      if (day % 10 === 1 && day !== 11) return 'st';
      if (day % 10 === 2 && day !== 12) return 'nd';
      if (day % 10 === 3 && day !== 13) return 'rd';
      return 'th';
    };

    const monthName = date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
    });

    return `${monthName} ${day}${getOrdinal(day)}, ${year}`;
  } catch (error) {
    console.error('Error formatting election date:', error);
    return '';
  }
}

// A function rather than a constant: index.ts loads .env after its imports are evaluated.
export const reportServerPort = (): number =>
  Number.parseInt(process.env.PORT ?? '8080', 10);

// Puppeteer fetches the stylesheet from this server, so the link follows its port.
const tailwindCssLink = () =>
  `<link href="http://localhost:${reportServerPort()}/tailwind.css" rel="stylesheet">`;

export const generateHTML = (
  candidates: { name: string; address: string; office: string }[],
  vacancyAppointments: { name: string; address: string }[],
  party: string,
  electionDate: string,
  numPages: number
) => {
  // Make sure the path to your built Tailwind CSS is correct
  const tailwindCSS = tailwindCssLink();

  // Convert election date from YYYY-MM-DD to "Month Day, Year" format
  const formattedElectionDate = formatElectionDateForPetition(electionDate);

  const html = Array.from({ length: numPages }, (_, i) => i + 1)
    .map((sheetNum) =>
      ReactDOMServer.renderToStaticMarkup(
        React.createElement(PetitionForm, {
          sheetNumber: sheetNum,
          candidates: candidates,
          vacancyAppointments: vacancyAppointments,
          party: party,
          electionDate: formattedElectionDate,
        })
      )
    )
    .join('');
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>PDF Content</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

export type PDFPageOptions = {
  format?: 'Letter' | 'Legal';
  landscape?: boolean;
};

/**
 * Generates a PDF from HTML and uploads to storage.
 * @param htmlContent - Rendered HTML
 * @param useLandscape - Legacy: true = Letter landscape, false = Legal portrait
 * @param fileName - Output filename
 * @param overrides - Optional: format + landscape (e.g. Legal landscape for sign-in sheets)
 */
export async function generatePDFAndUpload(
  htmlContent: string,
  useLandscape: boolean,
  fileName: string,
  overrides?: PDFPageOptions,
): Promise<void> {
  const puppeteerOptions = {
    // chrome-headless-shell: the headless-only build without the browser UI, lighter on the 1 GB box.
    // 03-build-packages.sh installs it; full Chrome is not installed in production.
    // Keep --single-process: without it chrome-headless-shell peaks higher than full Chrome with it.
    headless: 'shell' as const,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  };

  const format = overrides?.format ?? (useLandscape ? 'Letter' : 'Legal');
  const landscape = overrides?.landscape ?? useLandscape;

  console.log('generating pdf');
  const browser = await puppeteer.launch(puppeteerOptions);
  try {
    const page = await browser.newPage();

    page.setDefaultTimeout(120 * 1000);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    console.log('page content set');
    const pdfStream = (await page.createPDFStream({
      format,
      landscape,
      printBackground: true,
    })) as unknown as Readable;
    console.log('started upload via stream');

    const successfulUpload = await uploadFileToR2(pdfStream, fileName, 'pdf');

    if (!successfulUpload) {
      throw new Error('failed to upload pdf to file storage');
    }
  } finally {
    // Always close Chrome, or a failed report leaves it running and eats the 1 GB box's memory.
    await closeBrowser(browser);
  }
}

const BROWSER_CLOSE_TIMEOUT_MS = 10 * 1000;

/**
 * Closes Chrome, and kills it if it has not exited in time. chrome-headless-shell with --single-process
 * deadlocks in close() when no page was opened (e.g. newPage() failed), and close() has no timeout of
 * its own, so without the kill the report would never finish.
 */
async function closeBrowser(browser: Browser): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), BROWSER_CLOSE_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([
      browser.close().then(() => 'closed' as const),
      timedOut,
    ]);
    if (result === 'timeout') {
      console.error('Chrome did not close in time; killing it');
      browser.process()?.kill('SIGKILL');
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Transformed committee structure with simplified member fields for report rendering */
type CommitteeForReport = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, CommitteeMember[]>;
};

function transformToCommitteeMemberFormat(
  groupedCommittees: CommitteeReportStructure[]
): CommitteeForReport[] {
  return groupedCommittees.map((ld) => ({
    ...ld,
    committees: Object.fromEntries(
      Object.entries(ld.committees).map(([electionDistrict, members]) => [
        electionDistrict,
        (members as EnrichedPartialVoterRecordAPI[]).map((member) => {
          const name = createCompoundNameField(member);
          const address = createCompoundAddressField(member);

          return {
            name: name || member.name || '',
            address: address || member.address || '',
            city: member.city || '',
            state: member.state || '',
            zip: member.zipCode || '',
            phone: member.telephone || '',
            mailingAddress: createCompoundMailingAddressField(member),
            email: member.email || '',
          };
        }),
      ])
    ),
  }));
}

export const generateCommitteeReportHTML = (
  groupedCommittees: CommitteeReportStructure[],
  columns?: CommitteeRosterColumn[],
) => {
  const tailwindCSS = tailwindCssLink();

  const processedCommittees =
    transformToCommitteeMemberFormat(groupedCommittees);

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitteeReport, {
      groupedCommittees: processedCommittees,
      columns,
    }),
  );
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>Committee Report</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

export type SignInSheetHTMLOptions = SignInSheetTitleScope & {
  meetingName?: string;
  meetingDate?: string;
  contactInfoDate: string;
};

export const generateSignInSheetHTML = (
  committees: SignInSheetCommitteeInput[],
  {
    cityTown,
    legDistrict,
    meetingName,
    meetingDate,
    contactInfoDate,
  }: SignInSheetHTMLOptions,
): string => {
  const tailwindCSS = tailwindCssLink();

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SignInSheet, {
      sheets: buildSignInSheets(committees, { cityTown, legDistrict }),
      meetingName,
      meetingDate,
      contactInfoDate,
    }),
  );
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>Sign-In Sheet</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

/**
 * Generates HTML for the Designation Weight Summary PDF report.
 */
export const generateDesignationWeightSummaryHTML = (
  summaries: DesignationWeightSummary[],
  scopeDescription: string,
  reportAuthor?: string,
): string => {
  const tailwindCSS = tailwindCssLink();

  const groups = groupWeightSummaries(summaries);
  const grandTotalWeight = groups.reduce(
    (sum, g) => sum + g.subtotalWeight,
    0,
  );
  const committeesWithMissingWeights = summaries
    .filter((s) => s.missingWeightSeatNumbers.length > 0)
    .map((s) => ({
      cityTown: s.cityTown,
      legDistrict: s.legDistrict,
      electionDistrict: s.electionDistrict,
    }));

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(DesignationWeightSummaryReport, {
      groups,
      grandTotalWeight,
      scopeDescription,
      reportAuthor: reportAuthor ?? '',
      committeesWithMissingWeights,
    }),
  );
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>Designation Weight Summary</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

export const generateVacancyReportHTML = (
  rows: VacancyReportRow[],
  reportAuthor: string,
): string => {
  const tailwindCSS = tailwindCssLink();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(VacancyReport, { rows, reportAuthor: reportAuthor ?? '' }),
  );
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>Vacancy Report</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

export const generateChangesReportHTML = (
  rows: ChangesReportRow[],
  dateFrom: string,
  dateTo: string,
  reportAuthor: string,
): string => {
  const tailwindCSS = tailwindCssLink();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ChangesReport, {
      rows,
      dateFrom,
      dateTo,
      reportAuthor: reportAuthor ?? '',
    }),
  );
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>Committee Changes</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

export const generatePetitionOutcomesReportHTML = (
  rows: PetitionOutcomeRow[],
  reportAuthor: string,
): string => {
  const tailwindCSS = tailwindCssLink();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(PetitionOutcomesReport, {
      rows,
      reportAuthor: reportAuthor ?? '',
    }),
  );
  return `<!DOCTYPE html>
      <html>
        <head>
          <title>Petition Outcomes Report</title>
          ${tailwindCSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

function sleep(arg0: number) {
  return new Promise((resolve) => setTimeout(resolve, arg0));
}
