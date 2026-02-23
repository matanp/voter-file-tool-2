// src/index.ts
import express, { Request, Response } from 'express';
import { gunzipSync } from 'node:zlib';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import async from 'async';

import path from 'path';
import {
  generateHTML,
  generatePDFAndUpload,
  generateCommitteeReportHTML,
  generateSignInSheetHTML,
  generateDesignationWeightSummaryHTML,
  generateVacancyReportHTML,
  generateChangesReportHTML,
  generatePetitionOutcomesReportHTML,
} from './utils';
import {
  generateUnifiedXLSXAndUpload,
  generateDesignationWeightSummaryXLSXAndUpload,
  generateVacancyReportXLSXAndUpload,
  generateChangesReportXLSXAndUpload,
  generatePetitionOutcomesReportXLSXAndUpload,
} from './xlsxGenerator';
import { processAbsenteeReport } from './reportProcessors';
import { processVoterImport } from './reportProcessors/voterImportProcessor';
import { createWebhookSignature } from './webhookUtils';
import {
  enrichedReportDataSchema,
  callbackUrlSchema,
  MAX_RECORDS_FOR_EXPORT,
  type EnrichedReportData,
  type ReportCompleteWebhookPayload,
  type CallbackUrl,
  type VoterRecordField,
  type SearchQueryField,
  convertPrismaVoterRecordToAPI,
  buildPrismaWhereClause,
  normalizeSearchQuery,
  generateReportFilename,
} from '@voter-file-tool/shared-validators';
import { runBoeEligibilityFlagging } from '@voter-file-tool/shared-prisma';
import {
  mapCommitteesToReportShape,
  fetchCommitteeData,
  fetchSignInSheetData,
  fetchDesignationWeights,
  fetchVacancyData,
  fetchChangesData,
  fetchPetitionOutcomesData,
} from './committeeMappingHelpers';
import { prisma } from './lib/prisma';
import { processVoterImportJob } from './jobOrchestration';

expand(config());

const QUEUE_CONCURRENCY = 2;

const q = async.queue(async (requestData: EnrichedReportData) => {
  try {
    await processJob(requestData);
  } catch (error) {
    console.error('Queue worker error:', error);
  }
}, QUEUE_CONCURRENCY);

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);

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

      // Validate the request data using the enriched schema
      const validationResult =
        enrichedReportDataSchema.safeParse(rawRequestData);

      if (!validationResult.success) {
        console.log('Validation errors:', validationResult.error.errors);
      }

      if (!validationResult.success) {
        console.error('Invalid request data:', validationResult.error);
        return res.status(400).json({
          error: 'Invalid request data',
          details: validationResult.error.errors,
        });
      }

      const requestData: EnrichedReportData = validationResult.data;

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

/**
 * Fetches voter records based on search query
 * @param searchQuery - Array of search query fields
 * @returns Array of voter records
 */
async function fetchVoterRecords(searchQuery: SearchQueryField[]) {
  try {
    const normalized = normalizeSearchQuery(searchQuery);
    const whereClause = buildPrismaWhereClause(normalized);

    // First check the count to warn about large datasets
    const count = await prisma.voterRecord.count({
      where: whereClause,
    });

    if (count > MAX_RECORDS_FOR_EXPORT) {
      console.warn(
        `Query would return ${count} records, limiting to ${MAX_RECORDS_FOR_EXPORT}`
      );
    }

    const records = await prisma.voterRecord.findMany({
      where: whereClause,
      take: MAX_RECORDS_FOR_EXPORT,
    });

    return records;
  } catch (error) {
    console.error('Error fetching voter records:', error);
    throw new Error(
      `Failed to fetch voter records: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

type XLSXReportData = Extract<EnrichedReportData, { type: 'ldCommittees' | 'voterList' }>;

function extractXLSXConfig(jobData: XLSXReportData) {
  return {
    selectedFields: jobData.includeFields as VoterRecordField[],
    includeCompoundFields: jobData.xlsxConfig?.includeCompoundFields ?? { name: true, address: true },
    columnOrder: jobData.xlsxConfig?.columnOrder,
    columnHeaders: jobData.xlsxConfig?.columnHeaders,
  };
}

async function processJob(jobData: EnrichedReportData) {
  try {
    let fileName = '';
    let metadata:
      | {
          recordsProcessed: number;
          recordsCreated: number;
          recordsUpdated: number;
          dropdownsUpdated: boolean;
        }
      | undefined;
    const { reportAuthor, jobId } = jobData;
    const shouldSendCallback = jobData.type !== 'boeEligibilityFlagging';

    if (jobData.type === 'ldCommittees') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      console.log('Fetching committee data from database...');
      const committeeData = await fetchCommitteeData();
      const payload = mapCommitteesToReportShape(committeeData);
      console.log(`Fetched ${payload.length} committee groups from database`);

      if (jobData.format === 'xlsx') {
        console.log('Generating committee report as XLSX...');
        const xlsxConfig = extractXLSXConfig(jobData);
        await generateUnifiedXLSXAndUpload(
          payload,
          fileName,
          xlsxConfig,
          'ldCommittees'
        );
      } else {
        console.log('Processing committee report as PDF...');
        const html = generateCommitteeReportHTML(payload);
        await generatePDFAndUpload(html, true, fileName);
      }
    } else if (jobData.type === 'voterList') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      console.log('Processing voter list report as XLSX...');
      const xlsxConfig = extractXLSXConfig(jobData);

      console.log('Fetching voter records using search query...');
      const voterRecords = await fetchVoterRecords(jobData.searchQuery);
      console.log(`Found ${voterRecords.length} voter records`);

      const apiRecords = voterRecords.map(convertPrismaVoterRecordToAPI);

      await generateUnifiedXLSXAndUpload(
        apiRecords,
        fileName,
        xlsxConfig,
        'voterList'
      );
    } else if (jobData.type === 'designatedPetition') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      console.log('Processing designated petition form...');
      const { candidates, vacancyAppointments, party, electionDate, numPages } =
        jobData.payload;

      const html = generateHTML(
        candidates,
        vacancyAppointments,
        party,
        electionDate,
        numPages
      );
      await generatePDFAndUpload(html, false, fileName);
    } else if (jobData.type === 'absenteeReport') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);

      await processAbsenteeReport(fileName, jobId, jobData.csvFileKey);
    } else if (jobData.type === 'voterImport') {
      console.log('Processing voter import...');

      const voterImportResult = await processVoterImportJob(jobData, {
        processVoterImport,
        enqueueJob: (job) => {
          q.push(job);
        },
      });

      // For voter import, we don't generate a file to download, so fileName is empty
      fileName = '';

      // Store statistics in metadata for webhook
      metadata = voterImportResult.metadata;
      if (voterImportResult.followUpJobs.length > 0) {
        console.log(
          `Enqueuing ${String(voterImportResult.followUpJobs.length)} follow-up job(s) after voter import ${jobId}`
        );
      }
    } else if (jobData.type === 'signInSheet') {
      // TODO: Add integration test for processJob signInSheet handler producing PDF
      fileName = generateReportFilename(jobData.name, jobData.type, 'pdf', reportAuthor);
      const { scope, cityTown, legDistrict, meetingDate } = jobData;

      if (scope === 'jurisdiction' && (cityTown == null || cityTown === '')) {
        throw new Error('cityTown is required when scope is jurisdiction');
      }

      console.log('Fetching sign-in sheet data...');
      const data = await fetchSignInSheetData(scope, cityTown, legDistrict);
      console.log(`Fetched ${data.length} committees for sign-in sheet`);
      const html = generateSignInSheetHTML(data, meetingDate, reportAuthor);
      await generatePDFAndUpload(html, false, fileName, {
        format: 'Letter',
        landscape: false,
      });
    } else if (jobData.type === 'designationWeightSummary') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      const { scope, cityTown, legDistrict } = jobData;

      if (scope === 'jurisdiction' && (cityTown == null || cityTown === '')) {
        throw new Error('cityTown is required when scope is jurisdiction');
      }

      const scopeDescription =
        scope === 'countywide'
          ? 'Countywide'
          : cityTown === 'ROCHESTER' && legDistrict != null
            ? `${cityTown} LD ${legDistrict.toString().padStart(2, '0')}`
            : cityTown ?? 'Jurisdiction';

      console.log('Fetching designation weight data...');
      const data = await fetchDesignationWeights(scope, cityTown, legDistrict);
      console.log(`Fetched ${data.length} committees for designation weight summary`);

      if (jobData.format === 'xlsx') {
        await generateDesignationWeightSummaryXLSXAndUpload(data, fileName);
      } else {
        const html = generateDesignationWeightSummaryHTML(
          data,
          scopeDescription,
          reportAuthor,
        );
        await generatePDFAndUpload(html, true, fileName, {
          format: 'Letter',
          landscape: true,
        });
      }
    } else if (jobData.type === 'vacancyReport') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      const { scope, cityTown, legDistrict, vacancyFilter } = jobData;

      if (scope === 'jurisdiction' && (cityTown == null || cityTown === '')) {
        throw new Error('cityTown is required when scope is jurisdiction');
      }

      const vacancyRows = await fetchVacancyData(
        scope,
        vacancyFilter,
        cityTown,
        legDistrict,
      );
      if (jobData.format === 'xlsx') {
        await generateVacancyReportXLSXAndUpload(vacancyRows, fileName);
      } else {
        const html = generateVacancyReportHTML(vacancyRows, reportAuthor);
        await generatePDFAndUpload(html, true, fileName);
      }
    } else if (jobData.type === 'changesReport') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      const { scope, cityTown, legDistrict, dateFrom, dateTo } = jobData;

      if (!dateFrom || !dateTo) {
        throw new Error('dateFrom and dateTo are required for changes report');
      }
      if (scope === 'jurisdiction' && (cityTown == null || cityTown === '')) {
        throw new Error('cityTown is required when scope is jurisdiction');
      }

      const changesRows = await fetchChangesData(
        scope,
        dateFrom,
        dateTo,
        cityTown,
        legDistrict,
      );
      if (jobData.format === 'xlsx') {
        await generateChangesReportXLSXAndUpload(changesRows, fileName);
      } else {
        const html = generateChangesReportHTML(
          changesRows,
          dateFrom,
          dateTo,
          reportAuthor,
        );
        await generatePDFAndUpload(html, true, fileName);
      }
    } else if (jobData.type === 'petitionOutcomesReport') {
      fileName = generateReportFilename(jobData.name, jobData.type, jobData.format, reportAuthor);
      const { scope, cityTown, legDistrict } = jobData;

      if (scope === 'jurisdiction' && (cityTown == null || cityTown === '')) {
        throw new Error('cityTown is required when scope is jurisdiction');
      }

      const petitionRows = await fetchPetitionOutcomesData(
        scope,
        cityTown,
        legDistrict,
      );
      if (jobData.format === 'xlsx') {
        await generatePetitionOutcomesReportXLSXAndUpload(
          petitionRows,
          fileName,
        );
      } else {
        const html = generatePetitionOutcomesReportHTML(
          petitionRows,
          reportAuthor,
        );
        await generatePDFAndUpload(html, true, fileName);
      }
    } else if (jobData.type === 'boeEligibilityFlagging') {
      console.log(
        `Processing BOE eligibility flagging job ${jobId} (source report: ${jobData.sourceReportId ?? 'n/a'})`
      );
      await runBoeEligibilityFlagging(prisma, {
        termId: jobData.termId,
        sourceReportId: jobData.sourceReportId,
      });
    } else {
      throw new Error('Unknown job type');
    }

    if (shouldSendCallback) {
      // Create callback payload
      const callbackPayloadData: ReportCompleteWebhookPayload = {
        success: true,
        type: jobData.type,
        url: fileName || undefined, // Empty string becomes undefined for voter imports
        jobId,
        ...(metadata ? { metadata } : {}),
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
      console.log('calling callback url for report complete');

      await fetch(CALLBACK_URL, {
        method: 'POST',
        headers: callbackHeaders,
        body: callbackPayload,
      });
      console.log('done');
    }
  } catch (error) {
    console.error('Error processing job:', error);
    const shouldSendCallback = jobData.type !== 'boeEligibilityFlagging';
    if (!shouldSendCallback) {
      return;
    }

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
