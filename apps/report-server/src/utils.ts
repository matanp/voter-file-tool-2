import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import CommitteeReport from './components/CommitteeReport';
import puppeteer from 'puppeteer';

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

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  const puppeteerOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };

  const browser = await puppeteer.launch(puppeteerOptions);
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'Legal',
    printBackground: true,
  });

  const buffer = Buffer.from(pdfBuffer);

  // for debugging with the puppeetteer launched
  // await sleep(999999);
  // setTimeout(() => {
  //   browser.close();
  // }, 10000);
  await browser.close();

  return buffer;
}

export const generateCommitteeReportHTML = (
  groupedCommittees: any[]
) => {
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
