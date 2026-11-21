/**
 * measurements.json, written by `render --measured` on the box and judged by `verify` on the
 * operator's machine. `render` never compares against thresholds.
 */
import type { BrowserName } from './common';
import type { PhaseSummary, ProcessPeak } from './memory';

export const MEASUREMENTS_NAME = 'measurements.json';
export const SAMPLES_NAME = 'measurement-samples.jsonl.gz';
export const FAILURE_SCENARIOS_NAME = 'failure-scenarios.json';

export const DEFAULT_MEASURE = { repetitions: 3, intervalMs: 100, idleMs: 10_000 };

/**
 * The large fixture of each family, plus one ordinary roster as the single-report reference
 * (ticket 08). Together they cover every PDF job type.
 */
export const MEASURED_FIXTURES = [
  'roster-ed45-split',
  'roster-large-800x4',
  'legacy-large-800x4',
  'signin-151',
  'petition-10-long',
  'weights-200',
  'vacancy-200',
  'changes-200',
  'outcomes-200',
] as const;

export type MeasuredRender = {
  fixtureId: string;
  fixtureHash: string;
  browser: BrowserName;
  browserBuildId: string;
  browserVersion: string | null;
  /** 1-based. Repetition 1's PDF is the run's normal render record; later ones are extra objects. */
  repetition: number;
  key: string;
  status: 'ok' | 'failed';
  error?: string;
  durationMs: number;
  idle: PhaseSummary | null;
  render: PhaseSummary | null;
  processes: ProcessPeak[];
  leftoverProcesses: { pid: number; command: string }[];
  serviceActivity: Record<string, number> | { unavailable: string };
  /** Why this repetition's numbers may include production work; empty when none was seen. */
  interference: string[];
};

export type MeasurementsFile = {
  version: 1;
  runId: string;
  repetitions: number;
  intervalMs: number;
  idleMs: number;
  approximate: string;
  samplesFile: string;
  harnessParentRssKb: number;
  renders: MeasuredRender[];
};

export const APPROXIMATE_NOTE = 'RSS sums are approximate: pages shared between processes are counted once per process.';

/** Why a repetition's numbers might include production work. */
export function interferenceReasons(r: Pick<MeasuredRender, 'idle' | 'render' | 'serviceActivity'>, serviceRestarted: boolean): string[] {
  const reasons: string[] = [];
  const activity = r.serviceActivity;
  if (!('unavailable' in activity)) {
    const busy = Object.entries(activity).filter(([, n]) => n > 0);
    if (busy.length) reasons.push(`service job log lines: ${busy.map(([k, n]) => `${k} ${n}`).join(', ')}`);
  }
  for (const phase of [r.idle, r.render]) {
    if (!phase) continue;
    if (phase.serviceChromeSeen) reasons.push(`service Chrome running during ${phase.phase}`);
    if (phase.foreignChrome.length) reasons.push(`${phase.foreignChrome.length} other Chrome process(es) during ${phase.phase}`);
  }
  if (serviceRestarted) reasons.push('report-server restarted or changed pid');
  return reasons;
}
