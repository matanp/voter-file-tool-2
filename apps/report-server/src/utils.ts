import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import CommitteeReport from './components/CommitteeReport';
import puppeteer from 'puppeteer';
import { uploadFileToR2 } from './s3Utils';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import {
  createCompoundNameField,
  createCompoundAddressField,
  convertPrismaVoterRecordToAPI,
  applyCompoundFields,
  type EnrichedPartialVoterRecordAPI,
} from '@voter-file-tool/shared-validators';
import type {
  CommitteeReportStructure,
  CommitteeWithMembers,
} from './committeeMappingHelpers';
import type { CommitteeMember } from './components/CommitteeReport';
import SignInSheet from './components/SignInSheet';
import type { SignInSheetMember } from './components/SignInSheet';
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

export const generateHTML = (
  candidates: { name: string; address: string; office: string }[],
  vacancyAppointments: { name: string; address: string }[],
  party: string,
  electionDate: string,
  numPages: number
) => {
  // Make sure the path to your built Tailwind CSS is correct
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';

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
 * @param overrides - Optional: format + landscape (e.g. Letter portrait for sign-in sheets)
 */
export async function generatePDFAndUpload(
  htmlContent: string,
  useLandscape: boolean,
  fileName: string,
  overrides?: PDFPageOptions,
): Promise<void> {
  const puppeteerOptions = {
    headless: true,
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

  // const buffer = Buffer.from(pdfBuffer);

  // for debugging with the puppeetteer launched
  // await sleep(999999);
  // setTimeout(() => {
  //   browser.close();
  // }, 10000);
  await browser.close();
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
          };
        }),
      ])
    ),
  }));
}

export const generateCommitteeReportHTML = (
  groupedCommittees: CommitteeReportStructure[],
) => {
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';

  const processedCommittees =
    transformToCommitteeMemberFormat(groupedCommittees);

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitteeReport, {
      groupedCommittees: processedCommittees,
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

/** Transforms CommitteeWithMembers[] to SignInSheetCommittee[] for PDF rendering */
function transformToSignInSheetCommittees(
  committees: CommitteeWithMembers[],
): { cityTown: string; legDistrict: number; electionDistrict: number; members: SignInSheetMember[] }[] {
  return committees.map((c) => {
    const members: SignInSheetMember[] = (c.memberships ?? []).map((m) => {
      const apiRecord = convertPrismaVoterRecordToAPI(m.voterRecord);
      const withCompound = applyCompoundFields(apiRecord);
      const name = createCompoundNameField(withCompound) ?? withCompound.name ?? '';
      const address = createCompoundAddressField(withCompound) ?? withCompound.address ?? '';
      return { name, address };
    });
    return {
      cityTown: c.cityTown,
      legDistrict: c.legDistrict,
      electionDistrict: c.electionDistrict,
      members,
    };
  });
}

export const generateSignInSheetHTML = (
  committees: CommitteeWithMembers[],
  meetingDate?: string,
  reportAuthor?: string,
): string => {
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';

  const processedCommittees = transformToSignInSheetCommittees(committees);

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SignInSheet, {
      committees: processedCommittees,
      meetingDate,
      reportAuthor: reportAuthor ?? '',
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
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';

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
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';
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
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';
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
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';
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
