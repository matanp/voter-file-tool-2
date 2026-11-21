/**
 * One render in an isolated process. The parent (render.ts) forks this with a prepared
 * environment: TZ=UTC, PORT pointing at the harness's CSS endpoint, the storage R2_* variables
 * and a database URL that can't connect. It runs the deployed code from apps/report-server/dist:
 * the HTML generators, their pure helpers and generatePDFAndUpload. It never loads the service
 * entry point, enqueues jobs, queries the database or sends callbacks.
 *
 * Browser selection is the only patch: `puppeteer.launch` (the same module instance dist/utils
 * uses) is wrapped to set `headless` and `executablePath`; the production `args` pass through.
 *
 * A failure-scenario job (ticket 20, see scenarios.ts) also injects one failure into the first
 * generatePDFAndUpload call, through that launch wrapper or by replacing the deployed
 * dist/s3Utils `uploadFileToR2` export, then renders the same report again unpatched.
 */
import { createRequire } from 'module';
import path from 'path';
import { buildPdfCall, type DeployedModules } from './callShapes';
import { errorMessage } from './common';
import { fixtureById, RENDER_CONTEXT } from './fixtures';
import { INJECTED, type ScenarioName } from './scenarios';

export type WorkerJob = {
  fixtureId: string;
  deployedDistDir: string;
  key: string;
  headless: true | 'shell';
  executablePath: string;
  /** Inject this failure into the first render, then render again to `nextKey`. */
  scenario?: { name: ScenarioName; nextKey: string };
};

export type WorkerMessage =
  | { type: 'launch'; requested: Record<string, unknown>; effective: Record<string, unknown> }
  | { type: 'launched'; pid: number | null; browserVersion: string }
  | { type: 'html'; bytes: number; buildMs: number }
  | { type: 'scenario-start' }
  | { type: 'scenario-done'; error: string | null; ms: number }
  | { type: 'done'; ok: true; renderMs: number }
  | { type: 'done'; ok: false; error: string };

const send = (message: WorkerMessage) =>
  new Promise<void>((resolve) => {
    if (process.send) process.send(message, () => resolve());
    else resolve();
  });

/** Freezes `Date` (constructor without arguments and Date.now) while `fn` runs synchronously. */
export function withFrozenClock<T>(iso: string, fn: () => T): T {
  const RealDate = Date;
  const fixed = RealDate.parse(iso);
  class FrozenDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(fixed);
      else super(...(args as [string | number | Date]));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FrozenDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

type PuppeteerLike = { launch: (options?: Record<string, unknown>) => Promise<BrowserLike> };
type PageLike = { setContent: (...args: unknown[]) => Promise<unknown>; createPDFStream: (...args: unknown[]) => Promise<unknown> };
type BrowserLike = { process(): { pid?: number } | null; version(): Promise<string>; newPage(): Promise<PageLike> };
type S3UtilsLike = { uploadFileToR2: (...args: unknown[]) => Promise<boolean> };

const injected = (what: string) => new Error(`${INJECTED}: ${what}`);

/** Patches one launched browser for a page-level scenario. Upload scenarios patch s3Utils instead. */
export function injectIntoBrowser(browser: BrowserLike, scenario: ScenarioName): void {
  const newPage = browser.newPage.bind(browser);
  if (scenario === 'close-no-page') {
    browser.newPage = () => Promise.reject(injected('newPage'));
  } else if (scenario === 'setcontent-rejects' || scenario === 'pdf-stream-rejects') {
    browser.newPage = async () => {
      const page = await newPage();
      if (scenario === 'setcontent-rejects') page.setContent = () => Promise.reject(injected('setContent'));
      else page.createPDFStream = () => Promise.reject(injected('createPDFStream'));
      return page;
    };
  }
}

/** Replaces the deployed uploadFileToR2 export for an upload scenario; returns the restore function. */
export function injectIntoUpload(s3: S3UtilsLike, scenario: ScenarioName): () => void {
  const original = s3.uploadFileToR2;
  if (scenario === 'upload-rejects') s3.uploadFileToR2 = () => Promise.reject(injected('uploadFileToR2'));
  else if (scenario === 'upload-returns-false') s3.uploadFileToR2 = () => Promise.resolve(false);
  return () => {
    s3.uploadFileToR2 = original;
  };
}

async function run(job: WorkerJob): Promise<void> {
  const requireDeployed = createRequire(path.join(job.deployedDistDir, 'utils.js'));

  const puppeteerModule = requireDeployed('puppeteer') as { default?: PuppeteerLike } & PuppeteerLike;
  const puppeteer = puppeteerModule.default ?? puppeteerModule;
  const originalLaunch = puppeteer.launch.bind(puppeteer);
  let injection: ScenarioName | null = null;
  puppeteer.launch = async (requested: Record<string, unknown> = {}) => {
    const effective = { ...requested, headless: job.headless, executablePath: job.executablePath };
    await send({ type: 'launch', requested, effective });
    const browser = await originalLaunch(effective);
    await send({ type: 'launched', pid: browser.process()?.pid ?? null, browserVersion: await browser.version() });
    if (injection) injectIntoBrowser(browser, injection);
    return browser;
  };

  const d: DeployedModules = {
    utils: requireDeployed('./utils.js'),
    committeeMappingHelpers: requireDeployed('./committeeMappingHelpers.js'),
    committeeRosterConfig: requireDeployed('./committeeRosterConfig.js'),
    signInSheetHelpers: requireDeployed('./signInSheetHelpers.js'),
  };

  const fixture = fixtureById(job.fixtureId);
  const buildStart = performance.now();
  const call = withFrozenClock(RENDER_CONTEXT.now, () => buildPdfCall(fixture.input, d));
  await send({ type: 'html', bytes: Buffer.byteLength(call.html), buildMs: Math.round(performance.now() - buildStart) });

  if (job.scenario) {
    // The same module instance dist/utils calls at call time: `(0, s3Utils_1.uploadFileToR2)(...)`.
    const s3 = requireDeployed('./s3Utils.js') as S3UtilsLike;
    injection = job.scenario.name;
    const restore = injectIntoUpload(s3, job.scenario.name);
    await send({ type: 'scenario-start' });
    const start = performance.now();
    let error: string | null = null;
    try {
      await d.utils.generatePDFAndUpload(call.html, call.useLandscape, job.key, call.overrides);
    } catch (e) {
      error = errorMessage(e);
    } finally {
      injection = null;
      restore();
    }
    await send({ type: 'scenario-done', error, ms: Math.round(performance.now() - start) });
  }

  const renderStart = performance.now();
  await d.utils.generatePDFAndUpload(call.html, call.useLandscape, job.scenario?.nextKey ?? job.key, call.overrides);
  await send({ type: 'done', ok: true, renderMs: Math.round(performance.now() - renderStart) });
}

if (require.main === module) {
  process.once('message', (job: WorkerJob) => {
    run(job)
      .then(() => process.exit(0))
      .catch(async (error: unknown) => {
        await send({ type: 'done', ok: false, error: errorMessage(error) });
        process.exit(1);
      });
  });
}
