// src/index.ts
import express, { Request, Response } from 'express';

import path from 'path';
import { generateHTML, generatePDF } from './utils';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON requests
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
