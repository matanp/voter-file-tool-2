// src/index.ts
import express, { Request, Response } from 'express';
import { gunzipSync } from 'node:zlib';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import async from 'async';

import path from 'path';
import {
  generateHTML,
  generatePDFAndUpload,
  generateCommitteeReportHTML,
  generateXLSXAndUpload,
} from './utils';
import { createWebhookSignature } from './webhookUtils';
import {
  enrichedReportDataSchema,
  callbackUrlSchema,
  type EnrichedReportData,
  type ReportCompleteWebhookPayload,
  type CallbackUrl,
} from '@voter-file-tool/shared-validators';

// Function to sanitize reportAuthor for safe S3 key usage
function sanitizeReportAuthor(author: string): string {
  if (!author || typeof author !== 'string') {
    return randomUUID();
  }

  // Remove or replace unsafe characters for S3 keys
  // Replace slashes, spaces, and other problematic characters with hyphens
  // Convert to lowercase and remove any remaining special characters
  const sanitized = author
    .toLowerCase()
    .replace(/[\/\\\s]+/g, '-') // Replace slashes, backslashes, and whitespace with hyphens
    .replace(/[^a-z0-9\-_]/g, '') // Remove any remaining special characters except hyphens and underscores
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // If sanitization resulted in empty string, fallback to UUID
  return sanitized || randomUUID();
}

config();

const QUEUE_CONCURRENCY = 2;

const q = async.queue(async (requestData: EnrichedReportData) => {
  try {
    await processJob(requestData);
  } catch (error) {
    console.error('Queue worker error:', error);
  }
}, QUEUE_CONCURRENCY);

const app = express();
const PORT = process.env.PORT || 8080;

const callbackUrlResult = callbackUrlSchema.safeParse(
  process.env.CALLBACK_URL || 'http://localhost:3000/api/reportComplete'
);

if (!callbackUrlResult.success) {
  console.error('Invalid CALLBACK_URL:', callbackUrlResult.error);
  process.exit(1);
}

const CALLBACK_URL: CallbackUrl = callbackUrlResult.data;

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
      const decompressedBuffer = gunzipSync(req.body);
      console.log('decompressed gzip');
      const jsonString = decompressedBuffer.toString('utf-8');
      const rawRequestData = JSON.parse(jsonString);

      const validationResult =
        enrichedReportDataSchema.safeParse(rawRequestData);
      if (!validationResult.success) {
        console.error('Invalid request data:', validationResult.error);
        return res.status(400).json({
          error: 'Invalid request data',
          details: validationResult.error.errors,
        });
      }

      const requestData: EnrichedReportData = validationResult.data;

      // console.log('Received job data:', requestData);

      const jobsAhead = q.length();

      q.push(requestData);

      res.status(200).json({
        success: true,
        message: 'Job started successfully',
        numJobs: jobsAhead,
      });
    } catch (error) {
      console.error('Error handling /start-job request:', error);
      res.status(500).json({ error: 'Failed to start job' });
    }
  }
);

async function processJob(jobData: EnrichedReportData) {
  try {
    let pdfBuffer: Buffer;
    let fileName: string;
    const { type, reportAuthor, jobId, payload } = jobData;
    const format =
      type === 'ldCommittees' && 'format' in jobData ? jobData.format : 'pdf';

    // Sanitize reportAuthor for safe S3 key usage
    const sanitizedAuthor = sanitizeReportAuthor(reportAuthor);

    if (type === 'ldCommittees') {
      const fileExtension = format === 'xlsx' ? 'xlsx' : 'pdf';
      fileName =
        sanitizedAuthor +
        '/committeeReport/' +
        randomUUID() +
        '.' +
        fileExtension;

      if (format === 'xlsx') {
        console.log('Processing committee report as XLSX...');
        await generateXLSXAndUpload(payload, fileName);
      } else {
        console.log('Processing committee report as PDF...');
        const html = generateCommitteeReportHTML(payload);
        await generatePDFAndUpload(html, true, fileName);
      }
    } else if (type === 'designatedPetition') {
      fileName =
        sanitizedAuthor + '/designatedPetition/' + randomUUID() + '.pdf';
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
      await generatePDFAndUpload(html, false, fileName);
    } else {
      throw new Error('Unknown job type');
    }

    // Create callback payload
    const callbackPayloadData: ReportCompleteWebhookPayload = {
      success: true,
      type: type,
      url: fileName,
      jobId,
    };
    const callbackPayload = JSON.stringify(callbackPayloadData);

    // Create new webhook signature for the callback payload
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const callbackSignature = webhookSecret
      ? createWebhookSignature(callbackPayload, webhookSecret)
      : undefined;

    const callbackHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (callbackSignature) {
      callbackHeaders['x-webhook-signature'] = callbackSignature;
    }
    console.log('calling callback url for report comple');

    await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: callbackHeaders,
      body: callbackPayload,
    });
    console.log('done');
  } catch (error) {
    console.error('Error processing job:', error);

    // Create error callback payload
    const errorCallbackPayloadData: ReportCompleteWebhookPayload = {
      success: false,
      error: (error as Error).message,
      jobId: jobData.jobId,
    };
    const errorCallbackPayload = JSON.stringify(errorCallbackPayloadData);

    // Create new webhook signature for the error callback payload
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const errorCallbackSignature = webhookSecret
      ? createWebhookSignature(errorCallbackPayload, webhookSecret)
      : undefined;

    const errorCallbackHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (errorCallbackSignature) {
      errorCallbackHeaders['x-webhook-signature'] = errorCallbackSignature;
    }

    console.log('calling callback url on error: ', errorCallbackPayload);
    await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: errorCallbackHeaders,
      body: errorCallbackPayload,
    });
    console.log('done');
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
