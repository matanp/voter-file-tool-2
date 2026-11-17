import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

/** apps/report-server, whichever checkout the compiled harness runs from. */
export const SERVER_DIR = path.resolve(__dirname, '../..');
export const REPO_DIR = path.resolve(SERVER_DIR, '../..');
export const HARNESS_DIR = path.join(SERVER_DIR, 'pdf-validation');
export const DEFAULT_RUNS_DIR = path.join(HARNESS_DIR, 'runs');
export const DEFAULT_ENV_FILE = path.join(HARNESS_DIR, '.env.validation');
export const APPROVALS_FILE = path.join(HARNESS_DIR, 'baselines', 'approvals.json');
export const CHECKLIST_FILE = path.join(HARNESS_DIR, 'llm-review-checklist.md');
export const COMPARISON_IMAGE_DIR = path.join(HARNESS_DIR, 'comparison-image');

/** Every object the harness writes lives under this prefix. */
export const KEY_ROOT = 'pdf-validation';
export const runPrefix = (runId: string): string => `${KEY_ROOT}/${runId}/`;
export const baselineKey = (sha256: string): string => `${KEY_ROOT}/baselines/${sha256}.pdf`;
export const MANIFEST_NAME = 'manifest.json';

export const RUN_ID_PATTERN = /^\d{8}T\d{6}Z-[a-z0-9]{6}$/;

export function assertRunId(runId: string): void {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error(`Invalid run ID ${JSON.stringify(runId)} (expected e.g. 20261116T153000Z-ab12cd)`);
  }
}

/** Refuses any key outside this run's prefix, so cleanup can never reach other objects. */
export function assertKeyInRun(key: string, runId: string): void {
  const prefix = runPrefix(runId);
  if (!key.startsWith(prefix) || key.includes('..') || key.length === prefix.length) {
    throw new Error(`Refusing key ${JSON.stringify(key)}: not inside ${prefix}`);
  }
}

export const BROWSERS = ['chrome', 'shell'] as const;
export type BrowserName = (typeof BROWSERS)[number];
export const BROWSER_PRODUCT: Record<BrowserName, 'chrome' | 'chrome-headless-shell'> = {
  chrome: 'chrome',
  shell: 'chrome-headless-shell',
};
/** The `headless` launch option each browser needs. */
export const BROWSER_HEADLESS: Record<BrowserName, true | 'shell'> = { chrome: true, shell: 'shell' };

export type Status = 'pass' | 'fail' | 'needs-review';
const STATUS_RANK: Record<Status, number> = { pass: 0, 'needs-review': 1, fail: 2 };

/** Fail takes precedence over needs-review, which takes precedence over pass. */
export function worstStatus(statuses: Iterable<Status>): Status {
  let worst: Status = 'pass';
  for (const s of statuses) if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
  return worst;
}

export const EXIT_CODE: Record<Status, number> = { pass: 0, fail: 1, 'needs-review': 2 };

export type Check = { id: string; status: Status; detail: string };

export const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

export function sha256File(file: string): string {
  return sha256(fs.readFileSync(file));
}

/** JSON with sorted object keys, so a hash doesn't depend on property order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function newRunId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const suffix = Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
  return `${stamp}-${suffix}`;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

/** Paper sizes in PDF points, matching generatePDFAndUpload's format/landscape. */
export const PAPER = {
  letterLandscape: { name: 'Letter landscape', widthPt: 792, heightPt: 612 },
  legalLandscape: { name: 'Legal landscape', widthPt: 1008, heightPt: 612 },
  legalPortrait: { name: 'Legal portrait', widthPt: 612, heightPt: 1008 },
} as const;
export type Paper = (typeof PAPER)[keyof typeof PAPER];
export const DIMENSION_TOLERANCE_PT = 0.5;
export const RASTER_DPI = 144;

export const DEFAULT_TIMEOUTS = {
  /** One render + upload, or one download. */
  caseMs: 180_000,
  /** A whole `render` invocation. */
  invocationMs: 60 * 60_000,
};
