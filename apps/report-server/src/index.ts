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

const generateHTML = () => {
  // Make sure the path to your built Tailwind CSS is correct
  const tailwindCSS =
    '<link href="http://localhost:8080/tailwind.css" rel="stylesheet">';
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(PetitionForm)
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

// PDF generation function
async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Optional: this allows the browser to open at the default size
    args: ['--start-maximized'],
  });
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'Legal',
    printBackground: true,
  });

  const buffer = Buffer.from(pdfBuffer);

  await sleep(999999);
  setTimeout(() => {
    browser.close();
  }, 10000);
  await browser.close();

  return buffer;
}

// API endpoint to generate PDF from HTML
app.get('/generate-pdf', async (req: Request, res: Response) => {
  console.log('generating pdf');
  //   const { html } = req.body;

  //   if (!html) {
  //     return res.status(400).json({ error: 'HTML content is required' });
  //   }

  const html = generateHTML();

  //   console.log(html);

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
function sleep(arg0: number) {
  return new Promise((resolve) => setTimeout(resolve, arg0));
}
