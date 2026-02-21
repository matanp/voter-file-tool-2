import type { EnrichedReportData } from '@voter-file-tool/shared-validators';
import { buildFollowUpJobs, processVoterImportJob } from '../jobOrchestration';

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
