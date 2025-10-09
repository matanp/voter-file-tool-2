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
} from '@voter-file-tool/shared-validators';
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

export async function generatePDFAndUpload(
  htmlContent: string,
  useLandscape: boolean,
  fileName: string
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

  console.log('generating pdf');
  const browser = await puppeteer.launch(puppeteerOptions);
  const page = await browser.newPage();

  page.setDefaultTimeout(120 * 1000);
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  console.log('page content set');
  const pdfStream = (await page.createPDFStream({
    format: useLandscape ? 'Letter' : 'Legal',
    landscape: useLandscape,
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

function transformToCommitteeMemberFormat(groupedCommittees: any[]): any[] {
  return groupedCommittees.map((ld) => ({
    ...ld,
    committees: Object.fromEntries(
      Object.entries(ld.committees).map(([electionDistrict, members]) => [
        electionDistrict,
        (members as any[]).map((member: any) => {
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

export const generateCommitteeReportHTML = (groupedCommittees: any[]) => {
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';

  const processedCommittees =
    transformToCommitteeMemberFormat(groupedCommittees);

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitteeReport, {
      groupedCommittees: processedCommittees,
    })
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

function sleep(arg0: number) {
  return new Promise((resolve) => setTimeout(resolve, arg0));
}
