import type { EnrichedReportData } from '@voter-file-tool/shared-validators';
import {
  buildFollowUpJobs,
  buildRecurringBoeFlaggingJob,
  processVoterImportJob,
  resolveRecurringBoeFlaggingSchedule,
  startRecurringBoeFlaggingSchedule,
} from '../jobOrchestration';

describe('buildFollowUpJobs', () => {
  const voterImportJob: EnrichedReportData = {
    type: 'voterImport',
    format: 'txt',
    name: 'Nightly BOE Import',
    description: 'Daily import',
    fileKey: 'imports/boe-2026.txt',
    fileName: 'boe-2026.txt',
    year: 2026,
    recordEntryNumber: 12,
    reportAuthor: 'system',
    jobId: 'cm1234567890abcdef123456',
  };

  it('enqueues boeEligibilityFlagging after voterImport by default', () => {
    const jobs = buildFollowUpJobs(voterImportJob, {
      createJobId: () => 'boe-follow-up-id',
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(
      expect.objectContaining({
        type: 'boeEligibilityFlagging',
        sourceReportId: voterImportJob.jobId,
        jobId: 'boe-follow-up-id',
      }),
    );
  });

  it('supports test-time decoupling with an empty orchestration map', () => {
    const jobs = buildFollowUpJobs(voterImportJob, {
      orchestrationMap: {},
    });

    expect(jobs).toHaveLength(0);
  });
});

describe('processVoterImportJob', () => {
  const voterImportJob: Extract<EnrichedReportData, { type: 'voterImport' }> = {
    type: 'voterImport',
    format: 'txt',
    name: 'Nightly BOE Import',
    description: 'Daily import',
    fileKey: 'imports/boe-2026.txt',
    fileName: 'boe-2026.txt',
    year: 2026,
    recordEntryNumber: 12,
    reportAuthor: 'system',
    jobId: 'cm1234567890abcdef123456',
  };

  it('enqueues boeEligibilityFlagging after voter import completes', async () => {
    const processVoterImportMock = jest.fn().mockResolvedValue({
      recordsProcessed: 100,
      recordsCreated: 20,
      recordsUpdated: 80,
      dropdownsUpdated: true,
    });
    const enqueueJobMock = jest.fn();

    const result = await processVoterImportJob(voterImportJob, {
      processVoterImport: processVoterImportMock,
      enqueueJob: enqueueJobMock,
      createJobId: () => 'follow-up-id',
    });

    expect(processVoterImportMock).toHaveBeenCalledWith(
      voterImportJob.fileKey,
      voterImportJob.year,
      voterImportJob.recordEntryNumber,
      voterImportJob.jobId,
    );
    expect(enqueueJobMock).toHaveBeenCalledTimes(1);
    expect(enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'boeEligibilityFlagging',
        sourceReportId: voterImportJob.jobId,
        jobId: 'follow-up-id',
      }),
    );
    expect(result.metadata).toEqual({
      recordsProcessed: 100,
      recordsCreated: 20,
      recordsUpdated: 80,
      dropdownsUpdated: true,
    });
  });
});

describe('resolveRecurringBoeFlaggingSchedule', () => {
  it('defaults to enabled nightly interval', () => {
    expect(resolveRecurringBoeFlaggingSchedule({})).toEqual({
      enabled: true,
      intervalHours: 24,
      initialDelayMinutes: 10,
      termId: undefined,
    });
  });

  it('parses explicit schedule config from env', () => {
    expect(
      resolveRecurringBoeFlaggingSchedule({
        BOE_FLAGGING_RESCAN_ENABLED: 'true',
        BOE_FLAGGING_RESCAN_INTERVAL_HOURS: '6',
        BOE_FLAGGING_RESCAN_INITIAL_DELAY_MINUTES: '2',
        BOE_FLAGGING_RESCAN_TERM_ID: 'term-2026',
      }),
    ).toEqual({
      enabled: true,
      intervalHours: 6,
      initialDelayMinutes: 2,
      termId: 'term-2026',
    });
  });

  it('supports disabling recurring scans', () => {
    expect(
      resolveRecurringBoeFlaggingSchedule({
        BOE_FLAGGING_RESCAN_ENABLED: 'false',
      }),
    ).toEqual({
      enabled: false,
      intervalHours: 24,
      initialDelayMinutes: 10,
      termId: undefined,
    });
  });
});

describe('recurring BOE schedule', () => {
  it('builds recurring BOE job payload', () => {
    expect(
      buildRecurringBoeFlaggingJob({
        termId: 'term-2026',
        createJobId: () => 'job-recurring-1',
      }),
    ).toEqual({
      type: 'boeEligibilityFlagging',
      format: 'txt',
      name: 'BOE Eligibility Flagging (Scheduled)',
      description: 'Recurring BOE eligibility re-scan',
      reportAuthor: 'system',
      jobId: 'job-recurring-1',
      termId: 'term-2026',
    });
  });

  it('enqueues scheduled BOE flagging jobs without manual API trigger', () => {
    jest.useFakeTimers();
    const enqueueJob = jest.fn();

    const stop = startRecurringBoeFlaggingSchedule({
      enqueueJob,
      schedule: {
        enabled: true,
        intervalHours: 1,
        initialDelayMinutes: 1,
      },
      createJobId: () => 'job-recurring-1',
    });

    expect(enqueueJob).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(enqueueJob).toHaveBeenCalledTimes(1);
    expect(enqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'boeEligibilityFlagging',
        reportAuthor: 'system',
      }),
    );

    jest.advanceTimersByTime(60 * 60 * 1000);
    expect(enqueueJob).toHaveBeenCalledTimes(2);

    stop();
    jest.useRealTimers();
  });
});
