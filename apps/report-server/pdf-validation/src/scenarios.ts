/**
 * Failure scenarios for `render --failure-scenarios` (ticket 20). Each one injects a failure into
 * one generatePDFAndUpload call in the isolated worker, through the same launch patch browser
 * selection uses (and, for uploads, the deployed dist/s3Utils exports). No production code
 * changes, and nothing touches the live service, its jobs or its credentials.
 *
 * Then the same worker renders a normal report, so a failure that leaves Chrome or the event
 * loop stuck shows up as a blocked next report.
 */
import type { BrowserName } from './common';

export const INJECTED = 'pdf-validation injected failure';

export const SCENARIOS = {
  /** Post-launch render failure: the page's setContent rejects. */
  'setcontent-rejects': { expectError: `${INJECTED}: setContent` },
  /** Post-launch render failure: createPDFStream rejects. */
  'pdf-stream-rejects': { expectError: `${INJECTED}: createPDFStream` },
  /** Upload failure: uploadFileToR2 rejects. */
  'upload-rejects': { expectError: `${INJECTED}: uploadFileToR2` },
  /** Upload failure: uploadFileToR2 resolves false, so generatePDFAndUpload throws its own error. */
  'upload-returns-false': { expectError: 'failed to upload pdf' },
  /**
   * No-page close: browser.newPage() rejects, so generatePDFAndUpload closes a browser with no
   * page open. chrome-headless-shell with --single-process deadlocks there unless the deployed
   * build bounds browser.close() (PR #148). Full Chrome doesn't deadlock.
   */
  'close-no-page': { expectError: `${INJECTED}: newPage` },
} as const;

export type ScenarioName = keyof typeof SCENARIOS;
export const SCENARIO_NAMES = Object.keys(SCENARIOS) as ScenarioName[];

/** The report each scenario fails, and the one the worker renders next. */
export const SCENARIO_FIXTURE = 'roster-quick';

export const DEFAULT_FAILURE_TIMEOUT_MS = 30_000;

export type ScenarioCheck = { id: string; ok: boolean; detail: string };

export type ScenarioResult = {
  scenario: ScenarioName;
  browser: BrowserName;
  browserBuildId: string;
  timeoutMs: number;
  status: 'ok' | 'failed';
  checks: ScenarioCheck[];
  /** Time from the failing call's start to its settling, as the worker measured it. */
  scenarioMs: number | null;
  error: string | null;
  chromePids: number[];
  nextReport: { key: string; ok: boolean; detail: string; bytes?: number; sha256?: string };
  /**
   * Chrome still running once the failing call returned, checked before the worker went on (and
   * before Puppeteer's exit handler could kill it). Null when the call never settled. Absent in
   * results written before this check existed.
   */
  leftoversAfterFailure?: { pid: number; command: string }[] | null;
  /** Chrome still running after the worker exited. */
  leftoverProcesses: { pid: number; command: string }[];
};

export type FailureScenariosFile = {
  version: 1;
  runId: string;
  timeoutMs: number;
  fixture: string;
  results: ScenarioResult[];
};
