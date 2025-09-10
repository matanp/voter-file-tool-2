import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import CommitteeReport from './components/CommitteeReport';
import puppeteer from 'puppeteer';
import { uploadFileToR2 } from './s3Utils';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import {
  LDCommitteesArray,
  type CommitteeMember,
} from '@voter-file-tool/shared-validators';

const generateDynamicHeaders = (
  members: CommitteeMember[],
  compoundTypes?: any
): string[] => {
  if (members.length === 0) return ['Election District'];

  // Get all unique field names from the members
  const allFields = new Set<string>();
  for (const member of members) {
    for (const key of Object.keys(member)) {
      if (key !== 'electionDistrict') {
        allFields.add(key);
      }
    }
  }

  // Always start with Election District
  const headers = ['Election District'];

  // Add other fields in a consistent order
  const fieldOrder = [
    'name',
    'address',
    'city',
    'state',
    'zip',
    'phone',
    'firstName',
    'middleInitial',
    'lastName',
    'suffixName',
    'houseNum',
    'street',
    'apartment',
    'halfAddress',
    'resAddrLine2',
    'resAddrLine3',
    'mailingAddress1',
    'mailingAddress2',
    'mailingAddress3',
    'mailingAddress4',
    'mailingCity',
    'mailingState',
    'mailingZip',
    'mailingZipSuffix',
    'telephone',
    'email',
    'electionDistrict',
    'countyLegDistrict',
    'stateAssmblyDistrict',
    'stateSenateDistrict',
    'congressionalDistrict',
    'CC_WD_Village',
    'townCode',
    'VRCNUM',
    'addressForCommittee',
    'party',
    'gender',
    'DOB',
    'L_T',
    'originalRegDate',
    'statevid',
  ];

  // Add fields in the preferred order if they exist
  for (const field of fieldOrder) {
    if (allFields.has(field)) {
      headers.push(field);
      allFields.delete(field);
    }
  }

  // Add any remaining fields that weren't in the preferred order
  for (const field of Array.from(allFields).sort()) {
    headers.push(field);
  }

  return headers;
};

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
  const html = Array.from({ length: numPages }, (_, i) => i + 1)
    .map((sheetNum) =>
      ReactDOMServer.renderToStaticMarkup(
        React.createElement(PetitionForm, {
          sheetNumber: sheetNum,
          candidates: candidates,
          vacancyAppointments: vacancyAppointments,
          party: party,
          electionDate: electionDate,
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

export const generateCommitteeReportHTML = (groupedCommittees: any[]) => {
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitteeReport, {
      groupedCommittees: groupedCommittees,
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

export async function generateXLSXAndUpload(
  groupedCommittees: LDCommitteesArray,
  fileName: string
): Promise<void> {
  console.log('generating xlsx');

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Process each legislative district
  for (const ld of groupedCommittees) {
    const worksheetData: any[] = [];

    // Collect all members to generate dynamic headers
    const allMembers = Object.values(ld.committees).flat();

    // Generate dynamic headers based on actual data
    const headers = generateDynamicHeaders(allMembers, ld.compoundTypes);
    worksheetData.push(headers);

    // Add committee members data
    for (const [electionDistrict, members] of Object.entries(ld.committees)) {
      for (const member of members) {
        // Generate row data based on headers
        const rowData = headers.map((header: string) => {
          if (header === 'Election District') {
            return electionDistrict.padStart(3, '0');
          }

          const value = member[header as keyof typeof member];
          if (value !== null && value !== undefined) {
            // Special formatting for DOB field
            if (header === 'DOB' && value instanceof Date) {
              return value.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
            }
            return String(value);
          }
          return '';
        });

        worksheetData.push(rowData);
      }
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths - dynamic widths based on headers
    const allColumnWidths = headers.map((header: string) => {
      // Set appropriate widths for different field types
      if (header === 'Election District') return { wch: 15 };
      if (header === 'Name' || header === 'Address') return { wch: 25 };
      if (header === 'City') return { wch: 20 };
      if (header === 'State') return { wch: 8 };
      if (header === 'ZIP' || header === 'Phone') return { wch: 12 };
      return { wch: 15 }; // Default width for other fields
    });

    worksheet['!cols'] = allColumnWidths;

    // Add worksheet to workbook with a descriptive name
    const sheetName =
      ld.cityTown === 'ROCHESTER'
        ? `LD ${ld.legDistrict.toString().padStart(2, '0')}`
        : ld.cityTown;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Generate XLSX buffer
  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  console.log('started upload via stream');

  // Convert buffer to stream and upload
  const stream = new Readable();
  stream.push(xlsxBuffer);
  stream.push(null);

  const successfulUpload = await uploadFileToR2(stream, fileName, 'xlsx');

  if (!successfulUpload) {
    throw new Error('failed to upload xlsx to file storage');
  }

  console.log('xlsx upload completed');
}
