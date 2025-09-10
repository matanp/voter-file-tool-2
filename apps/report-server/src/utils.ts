import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import CommitteeReport from './components/CommitteeReport';
import puppeteer from 'puppeteer';
import { uploadFileToR2 } from './s3Utils';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import { LDCommitteesArray } from '@voter-file-tool/shared-validators';

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

    // Get allowed fields from the first LD (they should all be the same)
    const allowedFields = ld.allowedFields || [];

    // Create header row with base fields and additional fields
    const baseHeaders = [
      'Election District',
      'Name',
      'Address',
      'City',
      'State',
      'ZIP',
      'Phone',
    ];

    // Add additional field headers
    const additionalHeaders = allowedFields.map((field) => field);
    const allHeaders = [...baseHeaders, ...additionalHeaders];

    worksheetData.push(allHeaders);

    // Add committee members data
    for (const [electionDistrict, members] of Object.entries(ld.committees)) {
      for (const member of members) {
        const baseData = [
          electionDistrict.padStart(3, '0'),
          member.name,
          member.address,
          member.city,
          member.state,
          member.zip,
          member.phone || '',
        ];

        // Add additional field data
        const additionalData = allowedFields.map((field) => {
          const value = member[field as keyof typeof member];
          if (value !== null && value !== undefined) {
            // Special formatting for DOB field
            if (field === 'DOB' && value instanceof Date) {
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

        const allData = [...baseData, ...additionalData];
        worksheetData.push(allData);
      }
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths - base fields + dynamic widths for additional fields
    const baseColumnWidths = [
      { wch: 15 }, // Election District
      { wch: 25 }, // Name
      { wch: 30 }, // Address
      { wch: 20 }, // City
      { wch: 8 }, // State
      { wch: 10 }, // ZIP
      { wch: 15 }, // Phone
    ];

    // Add widths for additional fields (default to 15 characters)
    const additionalColumnWidths = allowedFields.map(() => ({ wch: 15 }));
    const allColumnWidths = [...baseColumnWidths, ...additionalColumnWidths];

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
