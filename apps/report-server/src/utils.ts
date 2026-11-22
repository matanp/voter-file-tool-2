import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import { PETITION_FIT_SCRIPT } from './petitionFit';
import CommitteeReport, { paginateCommittees } from './components/CommitteeReport';
import puppeteer, { type Page } from 'puppeteer';
import { uploadFileToR2 } from './s3Utils';
import { mergeTaggedPdfs } from './pdfMerge';
import { PDFDocument } from 'pdf-lib';
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
  sumWeights,
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
          <script>${PETITION_FIT_SCRIPT}</script>
        </body>
      </html>`;
};

export type PDFPageOptions = {
  format?: 'Letter' | 'Legal';
  landscape?: boolean;
};

const PUPPETEER_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
  ],
};

/**
 * Generates a PDF from HTML and uploads to storage.
 * @param htmlContent - Rendered HTML. An array is one report split into consecutive slices
 *   (see generateCommitteeReportHTMLChunks): each slice prints in its own Chrome, one after
 *   another, and the PDFs are merged with their accessibility tags. Chrome's memory follows
 *   the size of what it prints and isn't returned between prints in one browser, so a fresh
 *   browser per slice is what keeps a large report's peak to one slice's (ticket 24).
 * @param useLandscape - Legacy: true = Letter landscape, false = Legal portrait
 * @param fileName - Output filename
 * @param overrides - Optional: format + landscape (e.g. Legal landscape for sign-in sheets)
 * @param inspectPage - Optional: reads the laid-out page after setContent, before printing
 *   (e.g. which petition sheets still overflow). It must not change the page. Single HTML only.
 */
export async function generatePDFAndUpload(
  htmlContent: string | string[],
  useLandscape: boolean,
  fileName: string,
  overrides?: PDFPageOptions,
  inspectPage?: (page: Page) => Promise<void>,
): Promise<void> {
  const slices = typeof htmlContent === 'string' ? [htmlContent] : htmlContent;
  if (slices.length === 0) throw new Error('generatePDFAndUpload: no HTML to print');
  if (slices.length > 1 && inspectPage) {
    throw new Error('generatePDFAndUpload: inspectPage needs the report as one HTML');
  }
  const pdfOptions = {
    format: overrides?.format ?? (useLandscape ? 'Letter' : 'Legal'),
    landscape: overrides?.landscape ?? useLandscape,
    printBackground: true,
  } as const;

  if (slices.length === 1) {
    console.log('generating pdf');
    await withPage(slices[0], async (page) => {
      if (inspectPage) await inspectPage(page);
      const pdfStream = (await page.createPDFStream(
        pdfOptions,
      )) as unknown as Readable;
      console.log('started upload via stream');
      await uploadPdf(pdfStream, fileName);
    });
    return;
  }

  const parts: Uint8Array[] = [];
  for (const [i, html] of slices.entries()) {
    console.log(`generating pdf part ${i + 1} of ${slices.length}`);
    parts.push(await withPage(html, (page) => page.pdf(pdfOptions)));
  }
  console.log('merging pdf parts');
  const merged = await mergePdfParts(parts);
  // A view over the merged bytes, not a copy: a big report's PDF is already held once.
  await uploadPdf(
    Readable.from([Buffer.from(merged.buffer, merged.byteOffset, merged.byteLength)]),
    fileName,
  );
}

/** Launches Chrome, loads `html`, runs `use`, and always closes Chrome. */
async function withPage<T>(
  html: string,
  use: (page: Page) => Promise<T>,
): Promise<T> {
  const browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTIONS);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120 * 1000);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    console.log('page content set');
    return await use(page);
  } finally {
    // Always close Chrome, or a failed report leaves it running and eats the 1 GB box's memory.
    await browser.close();
  }
}

async function uploadPdf(pdf: Readable, fileName: string): Promise<void> {
  const successfulUpload = await uploadFileToR2(pdf, fileName, 'pdf');
  if (!successfulUpload) {
    throw new Error('failed to upload pdf to file storage');
  }
}

/**
 * Merges the parts keeping their tags. If the tag merge refuses the parts' structure (it only
 * accepts the shape Chrome writes today), the report still goes out: the pages are merged
 * without tags, as an untagged PDF, and the error is logged.
 */
async function mergePdfParts(parts: Uint8Array[]): Promise<Uint8Array> {
  try {
    return await mergeTaggedPdfs(parts);
  } catch (error) {
    console.error('Tagged PDF merge failed; uploading the report untagged:', error);
    const merged = await PDFDocument.create();
    for (const part of parts) {
      const src = await PDFDocument.load(part);
      for (const page of await merged.copyPages(src, src.getPageIndices())) {
        merged.addPage(page);
      }
    }
    return merged.save();
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
) => committeeReportHTML(transformToCommitteeMemberFormat(groupedCommittees), columns);

/**
 * Pages per PDF slice for committee reports. Chrome's peak follows how many pages it prints at
 * once: on Linux a 20-page slice peaks at about what a typical small report does (~450-540 MiB
 * for the whole container), where the 134-page fixtures need ~0.9-1.25 GiB in one print and
 * swap hard on the 1 GB box (ticket 24). Reports up to this size print in one piece, as before.
 */
export const COMMITTEE_REPORT_PAGES_PER_PDF = 20;

/**
 * Largest committee report printed as a PDF. Slicing bounds Chrome, but the merge builds the
 * whole PDF in node's heap: on the box, under the service's `--max-old-space-size=384`, it ran
 * out of heap between 560 and 600 pages, and slowed down from GC pressure from ~500 (ticket 24).
 * At 300 it used 237 MiB of heap, which leaves room for the service's own heap, and the box kept
 * ~300 MiB available with no new swap. Real reports are far smaller: at most 4 seats per ED, so
 * a fully seated county is ~110-120 pages.
 * Above the limit the job fails before Chrome starts, rather than node dying mid-merge.
 */
export const COMMITTEE_REPORT_MAX_PAGES = 300;

/**
 * The committee report as consecutive HTML documents of at most `pagesPerPdf` pages each, for
 * generatePDFAndUpload to print one at a time. The pages are the ones generateCommitteeReportHTML
 * lays out (pagination happens in code, before printing), numbered against the whole report.
 * A report that fits in one slice comes back as exactly generateCommitteeReportHTML's HTML.
 */
export const generateCommitteeReportHTMLChunks = (
  groupedCommittees: CommitteeReportStructure[],
  columns?: CommitteeRosterColumn[],
  pagesPerPdf = COMMITTEE_REPORT_PAGES_PER_PDF,
): string[] => {
  const committees = transformToCommitteeMemberFormat(groupedCommittees);
  const pageCount = paginateCommittees(committees).length;
  if (pageCount > COMMITTEE_REPORT_MAX_PAGES) {
    throw new Error(
      `This committee report would be ${pageCount} pages, over the ${COMMITTEE_REPORT_MAX_PAGES}-page limit for a PDF. ` +
        'Download it as XLSX instead, or narrow the roster to one jurisdiction.',
    );
  }
  if (pageCount <= pagesPerPdf) return [committeeReportHTML(committees, columns)];
  const slices: string[] = [];
  for (let start = 0; start < pageCount; start += pagesPerPdf) {
    slices.push(
      committeeReportHTML(committees, columns, {
        start,
        end: Math.min(start + pagesPerPdf, pageCount),
      }),
    );
  }
  return slices;
};

function committeeReportHTML(
  committees: CommitteeForReport[],
  columns?: CommitteeRosterColumn[],
  pageRange?: { start: number; end: number },
): string {
  const tailwindCSS = tailwindCssLink();

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitteeReport, {
      groupedCommittees: committees,
      columns,
      pageRange,
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
}

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
  const grandTotalWeight = sumWeights(groups.map((g) => g.subtotalWeight));
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

/**
 * Print rules for the reports the browser paginates: Vacancy, Changes and Petition Outcomes.
 * The other PDFs paginate in code with fixed-height pages and print with zero margins, so these
 * rules go only into these three documents, never into the shared PDF options.
 * - `@page` margin: continuation pages get space above the repeated header and below the last row.
 *   Left/right stay 0; the report containers' own padding is the side margin.
 * - Rows never split across a page; the table header repeats on each page.
 * - `.print-keep-with-next` keeps a group heading with what follows it;
 *   `.print-keep-with-previous` keeps a Subtotal row with the group's last row.
 */
export const BROWSER_PAGINATED_PRINT_CSS = `<style>
          @page { margin: 0.5in 0; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          .print-keep-with-next { break-after: avoid; }
          .print-keep-with-previous { break-before: avoid; }
          .print-keep-together { break-inside: avoid; }
        </style>`;

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
          ${BROWSER_PAGINATED_PRINT_CSS}
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
          ${BROWSER_PAGINATED_PRINT_CSS}
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
          ${BROWSER_PAGINATED_PRINT_CSS}
        </head>
        <body>
          ${html}
        </body>
      </html>`;
};

function sleep(arg0: number) {
  return new Promise((resolve) => setTimeout(resolve, arg0));
}
