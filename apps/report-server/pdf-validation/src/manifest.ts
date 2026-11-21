import type { BrowserName } from './common';
import type { CssRequest } from './cssServer';
import type { DeployedBuild, GitRevision, Maybe, ProcessInfo, ServiceState } from './diagnostics';
import type { ResolvedBrowser } from './browsers';
import type { R2Config, StorageConfig } from './storage';

/** 2 adds measured mode and failure scenarios (ticket 20). verify reads 1 and 2. */
export const MANIFEST_VERSION = 2;
export const READABLE_MANIFEST_VERSIONS = [1, 2];

export type RemoteObject = {
  key: string;
  /**
   * pdf: a render record's PDF. measured-pdf: a later measured repetition's PDF.
   * scenario-pdf: the report a failure scenario renders afterwards. The rest are evidence files.
   */
  kind: 'pdf' | 'log' | 'measured-pdf' | 'scenario-pdf' | 'measurements' | 'samples' | 'failure-scenarios';
  bytes: number;
  sha256: string;
};

export type RenderRecord = {
  fixtureId: string;
  fixtureHash: string;
  family: string;
  jobType: string;
  browser: BrowserName;
  /** Position of this browser within its fixture's pair, for `--browser both`. */
  orderInPair: number;
  key: string;
  startedAt: string;
  durationMs: number;
  status: 'ok' | 'failed';
  /** Box-side checks: completed in time, nonempty, %PDF- ... %%EOF. */
  checks: { id: string; ok: boolean; detail: string }[];
  error?: string;
  bytes?: number;
  sha256?: string;
  htmlBytes?: number;
  launch?: { requested: Record<string, unknown>; effective: Record<string, unknown> };
  browserVersion?: string;
  chromePid?: number | null;
  cssRequests: CssRequest[];
  /** Overlap with production work during this render: context, not a failure. */
  interference: { serviceActivity: Maybe<Record<string, number>>; foreignChrome: ProcessInfo[] };
  leftoverProcesses: ProcessInfo[];
};

export type RunManifest = {
  manifestVersion: number;
  runId: string;
  mode: 'quick' | 'full';
  browsers: BrowserName[];
  fixtureFilter: string[] | null;
  status: 'running' | 'ok' | 'failed' | 'interrupted';
  failures: string[];
  startedAt: string;
  finishedAt?: string;
  timeouts: { caseMs: number; invocationMs: number; overridden: string[] };
  /** `--measured` (manifest v2): repeated renders of the measured fixtures with RSS sampling. */
  measured?: { fixtures: string[]; repetitions: number; intervalMs: number; idleMs: number } | null;
  /** `--failure-scenarios` (manifest v2). */
  failureScenarios?: { scenarios: string[]; timeoutMs: number; fixture: string } | null;
  storage: { bucket: string; prefix: string; source: StorageConfig['source'] };
  harness: { revision: Maybe<GitRevision>; srcTree: Maybe<{ sha256: string; files: number }>; distTree: Maybe<{ sha256: string; files: number }>; fixtureManifestVersion: number };
  deployed: { revision: Maybe<GitRevision>; build: DeployedBuild };
  versions: { node: string; puppeteer: string; puppeteerCore: string; puppeteerBrowsers: string; pinnedBuilds: Record<string, string> };
  browsersResolved: ResolvedBrowser[];
  instance: Record<string, unknown>;
  css: { port: number; sha256: string; unchangedAtEnd: boolean | null };
  service: {
    before: Maybe<ServiceState>;
    after: Maybe<ServiceState> | null;
    healthAfter: Maybe<{ status: number }> | null;
    oomEvents: Maybe<{ source: string; lines: string[] }> | null;
    activityDuringRun: Maybe<Record<string, number>> | null;
  };
  fixtures: { id: string; hash: string; family: string; jobType: string; tier: string }[];
  renders: RenderRecord[];
  objects: RemoteObject[];
  /**
   * Every key render wrote or started to write, verified or not (e.g. a PDF uploaded by a render
   * that then timed out in browser.close()). Cleanup deletes these too.
   */
  attemptedKeys: string[];
};

export type { R2Config };
