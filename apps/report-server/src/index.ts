// src/index.ts
import express, { Request, Response } from 'express';
import zlib from 'zlib';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

import path from 'path';
import {
  generateHTML,
  generatePDF,
  generateCommitteeReportHTML,
} from './utils';
import { uploadPdfToR2 } from './s3Utils';

config();

const app = express();
const PORT = process.env.PORT || 8080;

const CALLBACK_URL =
  process.env.CALLBACK_URL || 'http://localhost:3000/api/reportComplete';

app.use((req, res, next) => {
  if (req.path === '/start-job') return next();
  express.json({ limit: '1mb' })(req, res, next);
});

app.use(express.static(path.join(__dirname, '../public')));

app.post(
  '/start-job',
  express.raw({ type: 'application/json', limit: '2mb' }), // gzipped data comes in as raw
  async (req: Request, res: Response) => {
    try {
      // Decompress the gzipped request body
      console.log('received request');
      const decompressedBuffer = zlib.gunzipSync(req.body);
      console.log('decompressed gzip');
      const jsonString = decompressedBuffer.toString('utf-8');
      const requestData = JSON.parse(jsonString);

      // console.log('Received job data:', requestData);

      console.log(`Started job`);

      res.status(200).json({
        success: true,
        message: 'Job started successfully',
      });

      processJob(requestData);
    } catch (error) {
      console.error('Error handling /start-job request:', error);
      res.status(500).json({ error: 'Failed to start job' });
    }
  }
);

async function processJob(jobData: any) {
  try {
    let pdfBuffer: Buffer;
    const { type, reportAuthor, jobId, payload } = jobData;

    let fileName = reportAuthor;

    if (type === 'ldCommittees') {
      fileName += '/committeeReport/' + randomUUID() + '.pdf';
      console.log('Processing committee report...');
      const html = generateCommitteeReportHTML(payload);
      pdfBuffer = await generatePDF(html, true);
    } else if (type === 'designatedPetition') {
      fileName += '/designatedPetition/' + randomUUID() + '.pdf';
      console.log('Processing designated petition form...');
      const { candidates, vacancyAppointments, party, electionDate, numPages } =
        payload;

      const html = generateHTML(
        candidates,
        vacancyAppointments,
        party,
        electionDate,
        numPages
      );
      pdfBuffer = await generatePDF(html, false);
    } else {
      throw new Error('Unknown job type');
    }

    await uploadPdfToR2(pdfBuffer, fileName);

    await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        type: type,
        url: fileName,
        jobId,
      }),
    });
  } catch (error) {
    console.error('Error processing job:', error);
    await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: (error as Error).message }),
    });
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
