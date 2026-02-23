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

const DEFAULT_RECURRING_BOE_RESCAN_INTERVAL_HOURS = 24;
const DEFAULT_RECURRING_BOE_RESCAN_INITIAL_DELAY_MINUTES = 10;

export type RecurringBoeFlaggingSchedule = {
  enabled: boolean;
  intervalHours: number;
  initialDelayMinutes: number;
  termId?: string;
};

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function resolveRecurringBoeFlaggingSchedule(
  env: NodeJS.ProcessEnv = process.env,
): RecurringBoeFlaggingSchedule {
  const enabledValue = normalizeOptionalText(env.BOE_FLAGGING_RESCAN_ENABLED);
  const enabled =
    enabledValue == null
      ? true
      : !['0', 'false', 'no', 'off'].includes(enabledValue.toLowerCase());

  return {
    enabled,
    intervalHours: parsePositiveInt(
      env.BOE_FLAGGING_RESCAN_INTERVAL_HOURS,
      DEFAULT_RECURRING_BOE_RESCAN_INTERVAL_HOURS,
    ),
    initialDelayMinutes: parsePositiveInt(
      env.BOE_FLAGGING_RESCAN_INITIAL_DELAY_MINUTES,
      DEFAULT_RECURRING_BOE_RESCAN_INITIAL_DELAY_MINUTES,
    ),
    termId: normalizeOptionalText(env.BOE_FLAGGING_RESCAN_TERM_ID),
  };
}

type BuildRecurringBoeFlaggingJobOptions = {
  termId?: string;
  createJobId?: () => string;
};

export function buildRecurringBoeFlaggingJob(
  options: BuildRecurringBoeFlaggingJobOptions = {},
): Extract<EnrichedReportData, { type: 'boeEligibilityFlagging' }> {
  const createJobId = options.createJobId ?? randomUUID;
  return {
    type: 'boeEligibilityFlagging',
    format: 'txt',
    name: 'BOE Eligibility Flagging (Scheduled)',
    description: 'Recurring BOE eligibility re-scan',
    reportAuthor: 'system',
    jobId: createJobId(),
    ...(options.termId ? { termId: options.termId } : {}),
  };
}

type StartRecurringBoeFlaggingScheduleOptions = {
  enqueueJob: (job: Extract<EnrichedReportData, { type: 'boeEligibilityFlagging' }>) => void;
  schedule?: RecurringBoeFlaggingSchedule;
  createJobId?: () => string;
};

export function startRecurringBoeFlaggingSchedule(
  options: StartRecurringBoeFlaggingScheduleOptions,
): () => void {
  const schedule = options.schedule ?? resolveRecurringBoeFlaggingSchedule();
  if (!schedule.enabled) {
    return () => {};
  }

  const intervalMs = schedule.intervalHours * 60 * 60 * 1000;
  const initialDelayMs = schedule.initialDelayMinutes * 60 * 1000;
  const createJobId = options.createJobId ?? randomUUID;

  let intervalHandle: NodeJS.Timeout | null = null;
  const enqueueRun = () => {
    options.enqueueJob(
      buildRecurringBoeFlaggingJob({
        termId: schedule.termId,
        createJobId,
      }),
    );
  };

  const initialDelayHandle = setTimeout(() => {
    enqueueRun();
    intervalHandle = setInterval(enqueueRun, intervalMs);
  }, initialDelayMs);

  return () => {
    clearTimeout(initialDelayHandle);
    if (intervalHandle) {
      clearInterval(intervalHandle);
    }
  };
}

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
