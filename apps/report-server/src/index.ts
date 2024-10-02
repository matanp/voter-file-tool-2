// src/index.ts
import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import ReactDOMServer from 'react-dom/server';
import PetitionForm from './components/DesignatingPetition';
import React from 'react';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON requests
app.use(express.json());

console.log(__dirname);
app.use(express.static(path.join(__dirname, '../public')));

const generateHTML = (
  names: string[],
  office: string,
  address: string,
  extraNames: string[],
  party: string,
  electionDate: string
) => {
  // Make sure the path to your built Tailwind CSS is correct
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(PetitionForm, {
      sheetNumber: 1,
      names: names,
      office: office,
      address: address,
      extraNames: extraNames,
      party: party,
      electionDate: electionDate,
    })
  );
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

async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--start-maximized'],
  });
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'Legal',
    printBackground: true,
  });

  const buffer = Buffer.from(pdfBuffer);

  // await sleep(999999);
  // setTimeout(() => {
  //   browser.close();
  // }, 10000);
  await browser.close();

  return buffer;
}

// API endpoint to generate PDF from HTML
app.post('/generate-pdf', async (req: Request, res: Response) => {
  const { names, office, address, extraNames, party, electionDate } = req.body;

  const html = generateHTML(
    names,
    office,
    address,
    extraNames,
    party,
    electionDate
  );

  try {
    const pdfBuffer = await generatePDF(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=output.pdf',
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    console.log('finished');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function sleep(arg0: number) {
  return new Promise((resolve) => setTimeout(resolve, arg0));
}
