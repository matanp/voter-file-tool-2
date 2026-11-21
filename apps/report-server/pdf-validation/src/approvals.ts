import fs from 'fs';
import { APPROVALS_FILE, writeJson, type BrowserName } from './common';

/**
 * baselines/approvals.json: committed, human-made decisions. Nothing in the harness writes it
 * except `approve`, which a person runs with their name. Machine checks never approve.
 */
export type BaselineEntry = {
  fixtureId: string;
  fixtureHash: string;
  browser: BrowserName;
  pdfSha256: string;
  /** Content-addressed copy in R2 (pdf-validation/baselines/<sha256>.pdf); cleanup never touches it. */
  key: string;
  pages: number;
  sourceRunId: string;
  reviewer: string;
  approvedAt: string;
  versions: {
    browserVersion: string;
    puppeteer: string;
    deployedCommit: string;
    comparisonImage: string;
    poppler: string;
    fonts: string[];
  };
};

/** Page counts for browser-paginated fixtures, taken only from inspected full-Chrome renders. */
export type PageCountEntry = {
  fixtureId: string;
  fixtureHash: string;
  pages: number;
  browser: 'chrome';
  pdfSha256: string;
  sourceRunId: string;
  reviewer: string;
  approvedAt: string;
};

/**
 * A reviewer's explicit acceptance, tied to the exact candidate PDF (and reference, for visual
 * changes), so it can't carry over to a different render. Content checks can't be accepted.
 */
export type Acceptance = {
  kind: 'visual-change' | 'layout-finding';
  fixtureId: string;
  browser: BrowserName;
  page: number;
  candidateSha256: string;
  referenceSha256: string | null;
  /** For a layout finding: the exact finding text accepted, so later findings on the page stay open. */
  finding: string | null;
  reason: string;
  reviewer: string;
  runId: string;
  acceptedAt: string;
};

export type MemoryMetric = 'chromePeakKb' | 'harnessPeakKb';

/**
 * An approved memory ceiling for one fixture in one browser build (ticket 20). "Build" is the
 * browser build ID, not the deployed commit: PR #148 changes which browser the service launches,
 * not the builds Puppeteer pins, so thresholds approved from a pre-#148 measured run still apply
 * after it. The deployed commit is recorded for provenance.
 */
export type ThresholdEntry = {
  fixtureId: string;
  fixtureHash: string;
  browser: BrowserName;
  browserBuildId: string;
  metric: MemoryMetric;
  maxKb: number;
  measured: { medianKb: number; maxKb: number; repetitions: number };
  headroomPct: number;
  sourceRunId: string;
  reviewer: string;
  approvedAt: string;
  versions: { browserVersion: string; puppeteer: string; deployedCommit: string; instance: string };
};

export type Approvals = {
  version: 1;
  baselines: BaselineEntry[];
  pageCounts: PageCountEntry[];
  acceptances: Acceptance[];
  thresholds: ThresholdEntry[];
};

export const EMPTY_APPROVALS: Approvals = { version: 1, baselines: [], pageCounts: [], acceptances: [], thresholds: [] };

export function loadApprovals(file = APPROVALS_FILE): Approvals {
  if (!fs.existsSync(file)) return EMPTY_APPROVALS;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Approvals;
  if (parsed.version !== 1) throw new Error(`${file}: unsupported approvals version ${String(parsed.version)}`);
  return parsed;
}

export const saveApprovals = (approvals: Approvals, file = APPROVALS_FILE) => writeJson(file, approvals);

export const findBaseline = (a: Approvals, fixtureId: string, fixtureHash: string, browser: BrowserName) =>
  a.baselines.find((b) => b.fixtureId === fixtureId && b.fixtureHash === fixtureHash && b.browser === browser) ?? null;

export const MEMORY_METRICS: readonly MemoryMetric[] = ['chromePeakKb', 'harnessPeakKb'];
export const DEFAULT_HEADROOM_PCT = 10;

/** What a threshold is keyed by: fixture (and its hash), browser, browser build, metric. */
export type ThresholdKey = Pick<ThresholdEntry, 'fixtureId' | 'fixtureHash' | 'browser' | 'browserBuildId' | 'metric'>;

export const sameThresholdKey = (a: ThresholdKey, b: ThresholdKey) =>
  a.fixtureId === b.fixtureId && a.fixtureHash === b.fixtureHash && a.browser === b.browser && a.browserBuildId === b.browserBuildId && a.metric === b.metric;

export const findThreshold = (a: Approvals, q: ThresholdKey) => a.thresholds.find((t) => sameThresholdKey(t, q)) ?? null;

export const findPageCount = (a: Approvals, fixtureId: string, fixtureHash: string) =>
  a.pageCounts.find((p) => p.fixtureId === fixtureId && p.fixtureHash === fixtureHash) ?? null;

export function isAccepted(
  a: Approvals,
  kind: Acceptance['kind'],
  q: { fixtureId: string; browser: BrowserName; page: number; candidateSha256: string; referenceSha256: string | null; finding?: string },
): Acceptance | null {
  return (
    a.acceptances.find(
      (x) =>
        x.kind === kind &&
        x.fixtureId === q.fixtureId &&
        x.browser === q.browser &&
        x.page === q.page &&
        x.candidateSha256 === q.candidateSha256 &&
        (kind === 'layout-finding' ? x.finding === q.finding : x.referenceSha256 === q.referenceSha256),
    ) ?? null
  );
}
