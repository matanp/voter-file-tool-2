// src/index.ts
import express, { Request, Response } from 'express';
import zlib from 'zlib';

import path from 'path';
import { generateHTML, generatePDF } from './utils';

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

app.post(
  '/generate-committee-report',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req: Request, res: Response) => {
    try {
      const decompressedBuffer = zlib.gunzipSync(req.body);

      const jsonString = decompressedBuffer.toString('utf-8');

      const groupedCommittees = JSON.parse(jsonString);

      console.log(groupedCommittees.slice(0, 50));

      console.log('Number of committees:', groupedCommittees.length);

      // TODO: generate PDF or other processing
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Failed to parse gzipped JSON:', err);
      res.status(400).json({ error: 'Invalid gzipped JSON' });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
