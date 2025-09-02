// src/index.ts
import express, { Request, Response } from 'express';
import zlib from 'zlib';
import { config } from 'dotenv';

import path from 'path';
import {
  generateHTML,
  generatePDF,
  generateCommitteeReportHTML,
} from './utils';
import { getPresignedReadUrl, uploadPdfToR2 } from './s3Utils';

config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON requests
// app.use(express.json());

app.use((req, res, next) => {
  if (req.path === '/generate-committee-report') return next();
  express.json({ limit: '1mb' })(req, res, next);
});

app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to generate PDF from HTML
app.post('/generate-pdf', async (req: Request, res: Response) => {
  const { candidates, vacancyAppointments, party, electionDate, numPages } =
    req.body;

  const html = generateHTML(
    candidates,
    vacancyAppointments,
    party,
    electionDate,
    numPages
  );

  try {
    const pdfBuffer = await generatePDF(html, false);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=output.pdf',
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    console.log('finished generating pdf');
  }
});

app.post(
  '/generate-committee-report',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req: Request, res: Response) => {
    try {
      const decompressedBuffer = zlib.gunzipSync(req.body);

      const jsonString = decompressedBuffer.toString('utf-8');

      const groupedCommittees = JSON.parse(jsonString);

      // console.log(groupedCommittees.slice(0, 50));

      console.log('Number of committees:', groupedCommittees.length);

      const html = generateCommitteeReportHTML(groupedCommittees.slice(0, 1));
      const pdfBuffer = await generatePDF(html, true);

      const url = await uploadPdfToR2(pdfBuffer);

      console.log(await getPresignedReadUrl(url, 3600));

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=committee_report.pdf',
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
