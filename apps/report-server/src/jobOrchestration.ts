import { randomUUID } from 'node:crypto';
import type { EnrichedReportData } from '@voter-file-tool/shared-validators';

export type JobOrchestrationMap = Partial<
  Record<EnrichedReportData['type'], EnrichedReportData['type'][]>
>;

type VoterImportJob = Extract<EnrichedReportData, { type: 'voterImport' }>;

export type VoterImportStats = {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  dropdownsUpdated: boolean;
};

export const DEFAULT_JOB_ORCHESTRATION: JobOrchestrationMap = {
  voterImport: ['boeEligibilityFlagging'],
};

type BuildFollowUpJobsOptions = {
  orchestrationMap?: JobOrchestrationMap;
  createJobId?: () => string;
};

export function buildFollowUpJobs(
  parentJob: EnrichedReportData,
  options: BuildFollowUpJobsOptions = {},
): EnrichedReportData[] {
  const orchestrationMap = options.orchestrationMap ?? DEFAULT_JOB_ORCHESTRATION;
  const createJobId = options.createJobId ?? randomUUID;
  const followUpTypes = orchestrationMap[parentJob.type] ?? [];

  const followUpJobs: EnrichedReportData[] = [];

  for (const followUpType of followUpTypes) {
    if (followUpType === 'boeEligibilityFlagging') {
      followUpJobs.push({
        type: 'boeEligibilityFlagging',
        format: 'txt',
        name: 'BOE Eligibility Flagging',
        description: 'Automatically triggered after voter import completion',
        reportAuthor: parentJob.reportAuthor,
        jobId: createJobId(),
        sourceReportId: parentJob.jobId,
      });
    }
  }

  return followUpJobs;
}

type ProcessVoterImportJobOptions = BuildFollowUpJobsOptions & {
  processVoterImport: (
    fileKey: string,
    year: number,
    recordEntryNumber: number,
    jobId: string,
  ) => Promise<VoterImportStats>;
  enqueueJob: (job: EnrichedReportData) => void;
};

export async function processVoterImportJob(
  jobData: VoterImportJob,
  options: ProcessVoterImportJobOptions,
): Promise<{
  metadata: VoterImportStats;
  followUpJobs: EnrichedReportData[];
}> {
  const importStats = await options.processVoterImport(
    jobData.fileKey,
    jobData.year,
    jobData.recordEntryNumber,
    jobData.jobId,
  );

  const followUpJobs = buildFollowUpJobs(jobData, {
    orchestrationMap: options.orchestrationMap,
    createJobId: options.createJobId,
  });

  for (const followUpJob of followUpJobs) {
    options.enqueueJob(followUpJob);
  }

  return {
    metadata: {
      recordsProcessed: importStats.recordsProcessed,
      recordsCreated: importStats.recordsCreated,
      recordsUpdated: importStats.recordsUpdated,
      dropdownsUpdated: importStats.dropdownsUpdated,
    },
    followUpJobs,
  };
}
